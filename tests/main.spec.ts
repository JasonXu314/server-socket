import WebSocket from 'ws';
import { Socket } from '../src';

let wss: WebSocket.WebSocketServer;
let socket: WebSocket;

type SocketMsgs = {
	TEST: { type: 'TEST'; test: string };
	TEST_2: { type: 'TEST_2'; test2: string };
	CONNECT: { type: 'CONNECT'; id: string };
};

describe('Main test suite', () => {
	it('Should construct & receive properly', async () => {
		return new Promise<void>((resolve) => {
			const l1 = jest.fn();
			const l2 = jest.fn();
			wss = new WebSocket.Server({ port: 5000 });
			socket = new WebSocket('ws://localhost:5000');

			wss.on('connection', (sock) => {
				const socket = new Socket<SocketMsgs, SocketMsgs>(sock);

				expect(socket).toBeDefined();

				socket.on('TEST', l1);
				socket.on('TEST_2', l2);

				socket.on('TEST', () => {
					expect(l1).toHaveBeenCalledTimes(1);
					expect(l1).toHaveBeenCalledWith({ type: 'TEST', test: 'hi' });
					expect(l2).toHaveBeenCalledTimes(0);
				});

				socket.on('TEST_2', () => {
					expect(l1).toHaveBeenCalledTimes(1);
					expect(l2).toHaveBeenCalledTimes(1);
					expect(l2).toHaveBeenCalledWith({ type: 'TEST_2', test2: 'hi' });
					resolve();
				});
			});

			socket.on('open', () => {
				socket.send(JSON.stringify({ type: 'TEST', test: 'hi' }));
				socket.send(JSON.stringify({ type: 'TEST_2', test2: 'hi' }));
			});
		});
	});

	it('Should send & receive properly', async () => {
		return new Promise<void>((resolve) => {
			const l1 = jest.fn();
			const l2 = jest.fn();
			wss = new WebSocket.Server({ port: 5000 });
			socket = new WebSocket('ws://localhost:5000');

			wss.on('connection', (sock) => {
				const socket = new Socket<SocketMsgs, SocketMsgs>(sock);

				socket.on('TEST', l1);
				socket.on('TEST_2', l2);

				socket.on('TEST', () => {
					expect(l1).toHaveBeenCalledTimes(1);
					expect(l1).toHaveBeenCalledWith({ type: 'TEST', test: 'hi' });
					expect(l2).toHaveBeenCalledTimes(0);
					socket.send({ type: 'TEST_2', test2: 'hi' });
				});

				socket.on('TEST_2', () => {
					expect(l1).toHaveBeenCalledTimes(1);
					expect(l1).toHaveBeenCalledWith({ type: 'TEST', test: 'hi' });
					expect(l2).toHaveBeenCalledTimes(1);
					expect(l2).toHaveBeenCalledWith({ type: 'TEST_2', test2: 'hi' });
					resolve();
				});
			});

			socket.on('message', (data) => {
				const msg = JSON.parse(data.toString());

				expect(msg).toMatchObject({ type: 'TEST_2', test2: 'hi' });
				socket.send(JSON.stringify({ type: 'TEST_2', test2: 'hi' }));
			});

			socket.on('open', () => {
				socket.send(JSON.stringify({ type: 'TEST', test: 'hi' }));
			});
		});
	});

	it('Should remove listener after 1 call', async () => {
		return new Promise<void>((resolve) => {
			const l1 = jest.fn();
			wss = new WebSocket.Server({ port: 5000 });
			socket = new WebSocket('ws://localhost:5000');

			wss.on('connection', (sock) => {
				const socket = new Socket<SocketMsgs, SocketMsgs>(sock);

				socket.once('TEST', l1);

				socket.on('TEST', () => {
					expect(l1).toHaveBeenCalledTimes(1);
					expect(l1).toHaveBeenCalledWith({ type: 'TEST', test: 'hi' });
				});

				socket.on('TEST_2', () => {
					resolve();
				});
			});

			socket.on('open', () => {
				socket.send(JSON.stringify({ type: 'TEST', test: 'hi' }));
				socket.send(JSON.stringify({ type: 'TEST', test: 'hi' }));
				socket.send(JSON.stringify({ type: 'TEST_2', test2: 'hi' }));
			});
		});
	});

	it('Should await correctly', async () => {
		return new Promise<void>((resolve) => {
			wss = new WebSocket.Server({ port: 5000 });
			socket = new WebSocket('ws://localhost:5000');

			wss.on('connection', async (sock) => {
				const l1 = jest.fn();
				const socket = new Socket<SocketMsgs, SocketMsgs>(sock);

				const connectMsg = await socket.await('CONNECT');

				expect(connectMsg).toMatchObject({ type: 'CONNECT', id: 'test' });
				expect(l1).toHaveBeenCalledTimes(0);

				socket.on('TEST_2', l1);

				socket.on('TEST_2', () => {
					expect(l1).toHaveBeenCalledTimes(1);
					expect(l1).toHaveBeenCalledWith({ type: 'TEST_2', test2: 'hi' });
					resolve();
				});

				socket.send({ type: 'TEST', test: 'hi' });
			});

			socket.on('open', () => {
				socket.send(JSON.stringify({ type: 'TEST_2', test: 'hi' }));
				socket.send(JSON.stringify({ type: 'CONNECT', id: 'test' }));

				socket.on('message', (data) => {
					const msg = JSON.parse(data.toString());

					expect(msg).toMatchObject({ type: 'TEST', test: 'hi' });
					socket.send(JSON.stringify({ type: 'TEST_2', test2: 'hi' }));
				});
			});
		});
	});
});

afterEach(async () => {
	await new Promise<void>((resolve) => {
		if (socket.readyState === WebSocket.OPEN) {
			socket.close();
			socket.onclose = () => resolve();
		} else {
			socket.onopen = () => {
				socket.close();
				socket.onclose = () => resolve();
			};
		}
	});

	await new Promise<void>((resolve) => {
		wss.close();
		wss.on('close', () => resolve());
	});
});
