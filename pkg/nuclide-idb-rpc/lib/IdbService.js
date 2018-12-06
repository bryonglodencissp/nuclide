/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {NuclideUri} from 'nuclide-commons/nuclideUri';
import type {ConnectableObservable} from 'rxjs';
import {observeProcess} from 'nuclide-commons/process';
import {Observable} from 'rxjs';
import {getAvailableServerPort} from 'nuclide-commons/serverPort';
import fsPromise from 'nuclide-commons/fsPromise';

export type IdbDaemonReadyMessage = {
  port: number,
};

function filterStdout(msg): Observable<string> {
  return msg.kind === 'stdout' ? Observable.of(msg.data) : Observable.empty();
}

export function startDaemon(): ConnectableObservable<IdbDaemonReadyMessage> {
  return Observable.defer(() => getAvailableServerPort())
    .switchMap(port =>
      observeProcess('idb', [
        'daemon',
        '--json',
        '--daemon-port',
        port.toString(),
      ])
        .concatMap(filterStdout)
        .map(line => JSON.parse(line)),
    )
    .publish();
}

export type IdbCompanionReadyMessage = {
  hostname: string,
  thrift_port: number,
};

export function startCompanion(
  udid: string,
): ConnectableObservable<IdbCompanionReadyMessage> {
  return Observable.defer(() => fsPromise.tempdir())
    .switchMap(tempDir =>
      observeProcess('idb_companion', ['--udid', udid, '--json'], {
        cwd: tempDir,
      })
        .concatMap(filterStdout)
        .map(line => JSON.parse(line)),
    )
    .publish();
}

export type IdbConnectMessage = {
  udid: string,
};

export function connect(
  companionHostname: string,
  companionPort: number,
  options?: {daemonHostname?: string, daemonPort?: number} = {},
): ConnectableObservable<IdbConnectMessage> {
  const args = [
    'connect',
    '--json',
    companionHostname,
    companionPort.toString(),
  ];
  if (typeof options.daemonHostname === 'string') {
    args.push('--daemon-host', options.daemonHostname);
  }
  if (typeof options.daemonPort === 'number') {
    args.push('--daemon-port', options.daemonPort.toString());
  }

  return observeProcess('idb', args)
    .concatMap(filterStdout)
    .map(line => JSON.parse(line))
    .publish();
}

export type IdbInstallMessage = {
  installedAppBundleId: string,
};

export function install(
  bundlePath: NuclideUri,
  options?: {daemonHostname?: string, daemonPort?: number} = {},
): ConnectableObservable<IdbInstallMessage> {
  const args = ['install', '--json', bundlePath];
  if (typeof options.daemonHostname === 'string') {
    args.push('--daemon-host', options.daemonHostname);
  }
  if (typeof options.daemonPort === 'number') {
    args.push('--daemon-port', options.daemonPort.toString());
  }

  return observeProcess('idb', args)
    .concatMap(filterStdout)
    .map(line => JSON.parse(line))
    .publish();
}