/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "3508b886cec14a845b87028e27bfd862"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9033f8d92b25e8da635d1bd7c8a36853"
  }, {
    "url": "pwa-192x192.png",
    "revision": "b6b86c72ca226a564107b79b80792406"
  }, {
    "url": "index.html",
    "revision": "01e87e288af3b79e7cf87ca4fc0d112d"
  }, {
    "url": "icon.svg",
    "revision": "9d640a7a7280310db8dc4b81b2cd4e59"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2de6e9f7cab2a2e1919fdc8d51eb4f3e"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-DYibmxM0.js",
    "revision": null
  }, {
    "url": "assets/index-BIy24GVc.css",
    "revision": null
  }, {
    "url": "assets/aistudio/___________________8___1__5b262246.html",
    "revision": null
  }, {
    "url": "assets/aistudio/WorldWar_ef827ce7.html",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2de6e9f7cab2a2e1919fdc8d51eb4f3e"
  }, {
    "url": "icon.svg",
    "revision": "9d640a7a7280310db8dc4b81b2cd4e59"
  }, {
    "url": "pwa-192x192.png",
    "revision": "b6b86c72ca226a564107b79b80792406"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9033f8d92b25e8da635d1bd7c8a36853"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "3508b886cec14a845b87028e27bfd862"
  }, {
    "url": "manifest.webmanifest",
    "revision": "089afb0bc4c219423dd279407916b9ea"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
