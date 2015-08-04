```
                       _                            _   
                      (_)                          | |  
  ___  __ _ _   _  ___ _  ___ _ __ ______ __ _  ___| |_ 
 / __|/ _` | | | |/ __| |/ _ \ '__|______/ _` |/ _ \ __|
 \__ \ (_| | |_| | (__| |  __/ |        | (_| |  __/ |_ 
 |___/\__,_|\__,_|\___|_|\___|_|         \__, |\___|\__|
                                          __/ |         
                                         |___/          
```

# Saucier-Get

This is an Express.JS compatible middlewares that provides backend API request support. This middleware can be used without adjustment when using Saucier to build a headless Drupal front-end.

This module requires you to create either an HTTP or HTTPS agent, and pass that to `saucier-get` when requiring. 

### Usage

```javascript
var https = require('https');
var saucierGet = require('saucier-get')( new https.Agent({ keepAlive: true}) );
var saucier = require('saucier-core')(saucierGet, saucierCache, templates, {});
```

An HTTPS agent is not required, but recommended. 
