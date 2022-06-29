import { EventSrc, EvtListener, KeyOf, Unsubscriber } from '@nano-utils/evt-src';
import WebSocket from 'ws';
import { SocketMsg } from './types';

/**
 * A wrapper class around the ws WebSocket API
 */
export class Socket<
	IM extends { [K in IT]: SocketMsg<K> },
	OM extends { [K in OT]: SocketMsg<K> },
	IT extends string = KeyOf<IM>,
	OT extends string = KeyOf<OM>
> {
	private _socket: WebSocket;
	private _msgQueue: OM[KeyOf<OM>][];
	private _events: EventSrc<{ [K in KeyOf<IM>]: [IM[K]] }>;

	/**
	 * Creates a new Socket object with the underlying WebSocket as the given WebSocket
	 * @param socket the existing WebSocket
	 */
	constructor(socket: WebSocket) {
		this._socket = socket;
		this._msgQueue = [];
		this._events = new EventSrc();

		this._socket
			.on('open', () => {
				this._msgQueue.forEach((msg) => this._socket.send(JSON.stringify(msg)));
				this._msgQueue = [];
			})
			.on('message', (data) => {
				if (Array.isArray(data)) {
					const msg = data.reduce((acc, cur) => acc + cur.toString(), '');
					const msgObj = JSON.parse(msg) as IM[KeyOf<IM>];

					this._events.dispatch(msgObj.type as KeyOf<IM>, msgObj);
				} else {
					const msg = JSON.parse(data.toString()) as IM[KeyOf<IM>];
					this._events.dispatch(msg.type as KeyOf<IM>, msg);
				}
			});
	}

	/**
	 * Sends the given message. If the socket is not open, will automatically queue it to be sent upon opening.
	 * @param msg the message to send
	 */
	public send<M extends KeyOf<OM>>(msg: OM[M]): void {
		if (this._socket.readyState === WebSocket.CONNECTING) {
			this._msgQueue.push(msg);
		} else if (this._socket.readyState === WebSocket.OPEN) {
			this._socket.send(JSON.stringify(msg));
		}
	}

	/**
	 * Attaches the given listener to listen for the given event
	 * @param msgType the type of the message to listen for
	 * @param listener the callback to be called
	 * @returns a function that will remove the listener upon call
	 */
	public on<M extends KeyOf<IM>>(msgType: M, listener: EvtListener<[IM[M]]>): Unsubscriber {
		return this._events.on<M>(msgType, listener);
	}

	/**
	 * Attaches the given listener to listen for the given event, but will automatically remove it after 1 call
	 * @param msgType the type of the message to listen for
	 * @param listener the callback to be called
	 * @returns a function that will remove the listener upon call
	 */
	public once<M extends KeyOf<IM>>(msgType: M, listener: EvtListener<[IM[M]]>): Unsubscriber {
		const unsubscribe = this._events.on<M>(msgType, (msg: IM[M]) => {
			listener(msg);
			unsubscribe();
		});

		return unsubscribe;
	}

	/**
	 * Used to wait for the next message of the given type using async/await
	 * @param msgType the type of the message to wait for
	 * @returns a promise that resolves with the next message received of the given type, when it is received
	 */
	public async await<M extends KeyOf<IM>>(msgType: M): Promise<IM[M]> {
		return new Promise((resolve) => {
			this.once(msgType, (msg) => resolve(msg));
		});
	}

	/**
	 * Closes the socket
	 */
	public close(): void {
		this._socket.close();
	}
}
