<p align="center">
  <img src="src/extension/icons/icon128.png" alt="Fentagram" width="96">
</p>

# Fentagram

A Chrome side panel for your own Instagram profile. It syncs your followers and following, shows who does not follow you back, and keeps a running list of unfollows and new follows.

Instagram could have built this. They didn’t. Your lists and tiny profile pics stay in this browser anyway—no password, no server.

## Use it

1. Open your profile on Instagram and click **Profile** in the nav to open the side panel.
2. Press **Sync** and leave that tab in front while it runs.
3. If you switch away, it pauses until you come back.

The three tabs are **Not following back** (A–Z), **Unfollowed**, and **Followed** (newest first). Names link to profiles. A partial sync is not counted as mass unfollows.

## Load it locally

```
npm install
npm test
npm run build
```

In Chrome, go to `chrome://extensions`, turn on Developer mode, load the `dist` folder, then refresh Instagram.

## Privacy

[Privacy policy](store-listing/privacy-policy.md)

## License

[MIT](LICENSE)
