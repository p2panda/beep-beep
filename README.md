beep-beep
===

This is a naive and simplistic proof-of-concept implementation of a p2p system which allows a hybrid of federated and fully distributed nodes in the same network inspired by [bamboo](https://github.com/AljoschaMeyer/bamboo), [Secure Scuttlebutt](https://scuttlebutt.nz/) and [ActivityPub](https://activitypub.rocks/). Also it allows us to have light clients which can purely stay in the browser without any proxy / tunneling, while still owning their keys.

There are plenty of comments about this idea in the code. Start [here](https://github.com/p2panda/beep-beep/blob/master/src/server/index.js)!

Don't be disappointed if you see some "fake" methods in the code, I didn't want to fall down into the rabbit hole of actually implementing this, this really serves only as a (working) concept and base for further discussions and specifications.

## Diagrams

<img src="https://raw.githubusercontent.com/p2panda/beep-beep/master/network.jpg" alt="Network Example" width="500" />

<img src="https://raw.githubusercontent.com/p2panda/beep-beep/master/stack.jpg" alt="Stack Example" width="500" />

## How to play with this

```
npm install
npm start
```

After starting a node it will show you an URL in the console. Open this in your browser to play with the client. You can also start more nodes in other terminal sessions and let them replicate data with each other.

Please note that this example only runs in your local network!

## Further experiments

* https://github.com/p2panda/beep-beep-server
* https://github.com/p2panda/beep-beep-client

## License

GNU Affero General Public License v3.0 `AGPL-3.0`
