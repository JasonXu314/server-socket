## Description

A lightweight wrapper library around the ws WebSocket API

## Installation

```
npm i @nano-utils/server-socket
```

or

```
yarn add @nano-utils/server-socket
```

## Usage

```js
import { Socket } from '@nano-utils/server-socket';
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (sock) => {
	const socket = new Socket(sock);

	socket.on('MY_MESSAGE', (msg) => {
		console.log(`Type: ${msg.type}, Foo: ${msg.foo}`); // Type: MY_MESSAGE, Foo: something
	});
});
```

With Typescript:

```ts
import { Socket } from '@nano-utils/server-socket';
import WebSocket from 'ws';

type Msgs = {
	MY_MESSAGE: { type: 'MY_MESSAGE'; foo: string };
};

const wss = new WebSocket.Server({ port: 3000 }); // second type parameter is for outgoing messages

wss.on('connection', (sock) => {
	const socket = new Socket<Msgs, {}>(sock);

	socket.on('MY_MESSAGE', (msg) => {
		console.log(`Type: ${msg.type}, Foo: ${msg.foo}`); // Type: MY_MESSAGE, Foo: something
	});
});
```

Sending Messages:

```ts
import { Socket } from '@nano-utils/server-socket';
import WebSocket from 'ws';

type IMsgs = {
	CONNECTION: { type: 'CONNECTION'; id: string };
};

type OMsgs = {
	CONNECTED: { type: 'CONNECTED'; user: { id: string; name: string } };
};

const wss = new WebSocket.Server('wss://example.com');

wss.on('connection', (sock) => {
	const socket = new Socket<IMsgs, OMsgs>(sock);

	socket.on('CONNECTION', (msg) => {
		socket.send({ type: 'CONNECTED', user: { id: msg.id, name: 'foo' } });
	});
});
```

Awaiting Messages:

```ts
import { Socket } from '@nano-utils/server-socket';
import WebSocket from 'ws';

type IMsgs = {
	CONNECTION: { type: 'CONNECTION'; id: string };
};

type OMsgs = {
	CONNECTED: { type: 'CONNECTED'; user: { id: string; name: string } };
};

const wss = new WebSocket.Server('wss://example.com');

wss.on('connection', async (sock) => {
	const socket = new Socket<IMsgs, OMsgs>(sock);

	const msg = await socket.await('CONNECTION');

	socket.send({ type: 'CONNECTED', user: { id: msg.id, name: 'foo' } });
});
```

## Usage Notes:

-   Each message (both outgoing and incoming) must have a type property, which is litstened to in the `on` method
-   If using typescript, each message's key in the message type map must match the type property of the message
-   This package is designed to be paired with the [web-sockets](https://npmjs.org/packages/@nano-utils/web-sockets) library on the frontend, but any client that sends messages in json format with type properties will work
