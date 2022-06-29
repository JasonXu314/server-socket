import { EventSrc, KeyOf, Unsubscriber } from '@nano-utils/evt-src';
import WebSocket from 'ws';
import { Socket } from './server-socket';
import { SocketMsg } from './types';

export class WSServer<
	IM extends { [K in IT]: SocketMsg<K> },
	OM extends { [K in OT]: SocketMsg<K> },
	IT extends string = KeyOf<IM>,
	OT extends string = KeyOf<OM>
> {
	private _wss: WebSocket.WebSocketServer;
	private _clients: Socket<IM, OM, IT, OT>[];
	private _events: EventSrc<{ connection: [any]; disconnect: [any] }>;

	constructor(wss: WebSocket.WebSocketServer) {
		this._wss = wss;
		this._clients = [];
		this._events = new EventSrc();

		this._wss.on('connection', (socket) => {
			const client = new Socket<IM, OM, IT, OT>(socket);
			this._clients.push(client);

			this._events.dispatch('connection', client);

			socket.on('close', () => {
				this._events.dispatch('disconnect', client);
				this._clients = this._clients.filter((c) => c !== client);
			});
		});
	}

	public on(evt: 'connection', cb: (client: Socket<IM, OM, IT, OT>) => void): Unsubscriber;
	public on(evt: 'disconnect', cb: (client: Socket<IM, OM, IT, OT>) => void): Unsubscriber;
	public on(evt: 'connection' | 'disconnect', cb: (...args: any) => any): Unsubscriber {
		switch (evt) {
			case 'connection':
				return this._events.on('connection', cb);
			case 'disconnect':
				return this._events.on('disconnect', cb);
			default:
				throw new Error('Invalid event type');
		}
	}

	public broadcast(msg: OM[KeyOf<OM>]): void {
		this._clients.forEach((client) => client.send(msg));
	}
}
