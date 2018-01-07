# node-torrent-cli

Read, make, and hash check torrents with node.js in the command line!

[![Dependency Status](https://david-dm.org/fent/node-torrent-cli.svg)](https://david-dm.org/fent/node-torrent-cli)

```bash
Usage: nt [command]

command     
  make             Make a torrent
  edit             Read a torrent, edit its metainfo variables, and write it. Can't change its files
  infohash         Return info hash from torrent
  pieces           Return piece hashes from torrent
  name             Return name from torrent
  announce         Return announce url from torrent
  announcelist     Return announce-list urls from torrent
  files            Return file paths and lengths from torrent
  urllist          Return web seed urls from torrent
  hashcheck        Hash checks torrent file. If no directory is given, will use cwd
```

![example img](http://i.imgur.com/y47Sc.png)


# Install

```bash
npm -g install nt-cli
```
