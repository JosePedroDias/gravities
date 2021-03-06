(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    var DEG2RAD = 180 / Math.PI;
    var SCREEN_DIMS;

    var     DT = 1 / 30;
    var PREV_T = 0 - DT;
    var      T = 0;

    var KEYS = {};
    var KEYS_WENT_DOWN = {};
    var KEYS_WENT_UP   = {};
    var K_LEFT  = 37;
    var K_RIGHT = 39;
    var K_SPACE = 32;



    var BY_ID = {};
    var PLANETS = [];
    var CURRENT_PLANET;
    var TOKENS = [];
    var ACTORS = [];
    var PLAYER; // user controlled actor



    /*******
     * SFX *
     *******/
    var play = function(soundId) {
        createjs.Sound.play(soundId);
    };

    var preloadSfx = function(cb) {
        var soundIds = [
            'boing',
            // 'explosion',
            // 'force field',
            // 'game over',
            'item',
            // 'metallic',
            // 'near',
            // 'off',
            // 'pew',
            'pow',
            // 'sentry',
            'squish',
            // 'triangle',
            // 'up'
        ];
        var remainingSounds = soundIds.length;

        createjs.Sound.alternateExtensions = ['mp3'];
        createjs.Sound.addEventListener('fileload', function(/*ev*/) {
            --remainingSounds;
            //log('loaded ' + ev.id);
            if (remainingSounds === 0) { cb(null); }
        });

        soundIds.forEach(function(soundId) {
            createjs.Sound.registerSound('sfx/' + soundId + '.ogg', soundId);
        });
    };



    /**********************************************
     * IMPORT BOX2D STUFF LOCALLY FOR CONVENIENCE *
     **********************************************/
    var Vec2            = Box2D.Common.Math.b2Vec2;
    //var Mat22           = Box2D.Common.Math.b2Mat22;
    //var Transform       = Box2D.Common.Math.b2Transform;
    var World           = Box2D.Dynamics.b2World;
    var BodyDef         = Box2D.Dynamics.b2BodyDef;
    var Body            = Box2D.Dynamics.b2Body;
    var FixtureDef      = Box2D.Dynamics.b2FixtureDef;
    var ContactListener = Box2D.Dynamics.b2ContactListener;
    var CircleShape     = Box2D.Collision.Shapes.b2CircleShape;
    var PolygonShape    = Box2D.Collision.Shapes.b2PolygonShape;



    /* request animation frame - generic */
    var raf = window.requestAnimationFrame       ||
              window.mozRequestAnimationFrame    ||
              window.webkitRequestAnimationFrame ||
              window.msRequestAnimationFrame;

    var log = function() {
        window.console.log.apply(window.console, arguments);
    };

    /* simplest AJAX */
    var ajax = function(uri, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', uri, true);
        var cbInner = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                return cb(null, JSON.parse(xhr.response));
            }
            cb('error requesting ' + uri);
        };
        xhr.onload  = cbInner;
        xhr.onerror = cbInner;
        xhr.send(null);
    };



    /**
     * dot product of 2D vectors and vector projection
     */
    var dotProd = function(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    };

    var compOfAInB = function(vA, vB, bIsNormalized) {
        var n = dotProd(vA, vB);
        if (!bIsNormalized) {
            n /= vB.Length();
        }
        return n;
    };



    var WORLD = new World( new Vec2(0, 0), true); // gravityVec, doSleep



    /*****************************************************
     * VECTOR GRAPHICS WITH SVG + UTIL METHODS FOR BOX2D *
     *****************************************************/
    var hasTouch = !!(
        'ontouchstart' in document.documentElement ||
        'ontouchstart' in document
    );
    //hasTouch = true;



    var s;
    var onResize = function() {
        //if (hasTouch) { // HACK
        //    SCREEN_DIMS = [screen.availWidth, screen.availHeight];
        //}
        //else {
            SCREEN_DIMS = [window.innerWidth, window.innerHeight];
        //}

        //log('resize', SCREEN_DIMS);
        if (s) {
            s.attr({
                width:  SCREEN_DIMS[0],
                height: SCREEN_DIMS[1]
            });
        }
    };
    onResize();



    var S = Snap;
    s = S(SCREEN_DIMS[0], SCREEN_DIMS[1]);

    var rootEl = s.g();
    var guiEl  = s.g();

    var fpsText = s.text(10, 20, 'FPS: ');
    fpsText.attr({'font-family': 'sans-serif'});

    var createShape = function(o) {
        var shape;
        if ('dims' in o) {
            shape = s.rect(-o.dims[0]/2, -o.dims[1]/2, o.dims[0], o.dims[1]); // x, y, w, h
        }
        else if ('radius' in o) {
            shape = s.circle(0, 0, o.radius); // cx, cy, r
        }
        else {
            throw 'must set either dims or radius';
        }

        var g = s.g(shape);
        rootEl.append(g);

        var api = {
            setPosRot: function(pos, rot) {
                if (pos !== undefined) { this._pos = pos; }
                if (rot !== undefined) { this._rot = rot; }
                g.transform(
                    S.matrix()
                        .translate(this._pos[0], this._pos[1])
                        .rotate(this._rot)
                );
            },
            translate: function(deltaPos, skipApplication) {
                this._pos[0] += deltaPos[0];
                this._pos[1] += deltaPos[1];
                if (!skipApplication) { this.setPosRot(); }
            },
            rotate: function(deltaRot, skipApplication) {
                this._rot += deltaRot;
                if (!skipApplication) { this.setPosRot(); }
            },
            attr: function() {
                shape.attr.apply(shape, arguments);
            },
            applyForce: function(dir, strength) {
                var force = new Vec2(dir[0], dir[1]);
                if (strength) {
                    force.Normalize();
                    force.Multiply(strength);
                }
                this._b.ApplyForce(force, this._b.GetPosition()); // forceDir in newtons, center of application
            },
            applyPointGravity: function(pos, strength) {
                var p1 = this.getPosition();
                this.applyForce(
                    [ pos[0] - p1[0],
                      pos[1] - p1[1] ],
                    strength
                );
            },
            applyImpulse: function(dir, strength) {
                var imp = new Vec2(dir[0], dir[1]);
                if (strength) {
                    imp.Normalize();
                    imp.Multiply(strength);
                }
                this._b.ApplyImpulse(imp, this._b.GetPosition()); // forceDir in  N-seconds or kg-m/s, center of application
            },
            applyNormal: function(ctr, strength, o) { // o:align,tangent,impulse
                var p1 = this.getPosition();
                var v = new Vec2(
                    ctr[0] - p1[0],
                    ctr[1] - p1[1]
                );
                v.Normalize();

                if (o.align) {
                    this._b.SetAngle( Math.atan2(v.y, v.x) );
                }

                if (strength === 0) { return; }

                v.Multiply(strength);

                // The right-hand normal of vector (x, y) is (y, -x), and the left-hand normal is (-y, x).
                if (o.tangent) {
                    var t = v.x;
                    v.x = -v.y;
                    v.y = t;
                }

                if (o.impulse) {
                    this._b.ApplyImpulse(v, this._b.GetPosition());
                }
                else {
                    this._b.ApplyForce(v, this._b.GetPosition());
                }
            },
            getPosition: function(original) {
                if (this._b) {
                    var p1 = this._b.GetPosition();
                    if (original) { return p1; }
                    return [p1.x, p1.y];
                }
                if (original) {
                    return new Vec2(this._pos[0], this._pos[1]);
                }
                return this._pos;
            },
            getRotation: function() {
                if (this._b) {
                    return this._b.GetAngle();
                }
                //return this._rot;
            },
            update: function() {
                this.setPosRot(this.getPosition(), this.getRotation() * DEG2RAD);
            },
            remove: function() {
                WORLD.DestroyBody(this._b);
                g.remove();
            }
        };

        if ('controlledBy' in o) {
    		api._controlledBy = o.controlledBy;
    	}

        api._pos = o.position || [0, 0];
        api._rot = o.rotation || 0;
        api.setPosRot();

        return api;
    };

    var createBody = function(o) {
        var fixDef = new FixtureDef();
        fixDef.density     = o.density     || 1.0;
        fixDef.friction    = o.friction    || 0.5;
        fixDef.restitution = o.restitution || 0.2;

        var bodyDef = new BodyDef();
        bodyDef.type = o.isStatic ? Body.b2_staticBody : Body.b2_dynamicBody;

        if ('position' in o) {
            bodyDef.position.x = o.position[0];
            bodyDef.position.y = o.position[1];
        }

        if ('radius' in o) {
            fixDef.shape = new CircleShape(o.radius); // r
        }
        else if ('dims' in o) {
            fixDef.shape = new PolygonShape();
            fixDef.shape.SetAsBox(o.dims[0]/2, o.dims[1]/2); // half w, half h
        }
        else {
            throw 'either radius or dims must be provided!';
        }

        var body = WORLD.CreateBody(bodyDef);
        body.CreateFixture(fixDef);

        if ('data' in o) {
            body.SetUserData(o.data);
        }

        return body;
    };



    var ctctListener = new ContactListener();
    ctctListener.BeginContact = function(contact) {
        var a = contact.GetFixtureA().GetBody();
        var b = contact.GetFixtureB().GetBody();
        var pBody = PLAYER._b;
        //return log(a.GetUserData(), b.GetUserData());
        if (a !== pBody && b !== pBody) { return; }
        var p = ( (a === pBody) ? b : a);

        var ud = p.GetUserData();
        if (p !== CURRENT_PLANET._b && ud.indexOf('planet ') === 0) {
            play('pow');
            CURRENT_PLANET = BY_ID[ ud.split(' ')[1] ];
            return;
        }
        //log('player contact w/ ', ud);
    };
    WORLD.SetContactListener(ctctListener);



    var onFrame = function onFrame(t) {
        T = t * 0.001;
        DT = T - PREV_T;

        WORLD.Step(DT*10, 10, 10); // box2D step - step duration in secs, vel iters, pos iters

        WORLD.ClearForces();



        // updates box2D-controlled visual entities
        TOKENS.forEach(function(token) {
            token.update();
        });

        var toKill = [];

        ACTORS.forEach(function(actor) {
            actor.update();

            // detect if anything exists 3px below the 20x20 actor's box
            var aboveStuff = false;
            var bp = actor.getPosition(true);
            var v = bp.Copy();
            v.Subtract( CURRENT_PLANET.getPosition(true) );
            v.Normalize();
            v.Multiply(-13);
            v.Add(bp);
            var cb = (actor === PLAYER) ?
                function(fixture) {
                    aboveStuff = true;
                    var udParts = fixture.GetBody().GetUserData().split(' ');
                    var type = udParts[0];
                    var id   = udParts[1];
                    if (type === 'token') { // TODO || type === 'actor') {
                        //log('- #' + id + ' (' +  type + ')');
                        toKill.push( BY_ID[ udParts[1] ] );
                    }
                } :
                function() { aboveStuff = true; };
            WORLD.QueryPoint(cb, v);
            actor._isAboveStuff = aboveStuff;
        });

        toKill.forEach(function(visualShape) {
            var udParts = visualShape._b.GetUserData().split(' ');
            var type = udParts[0];
            var arr = (type === 'actor') ? ACTORS : TOKENS;
            arr.splice(arr.indexOf(visualShape), 1);
            play('item');
            visualShape.remove();
        });



        // apply current planet gravity to actors and tokens
        var currPlanetPos = CURRENT_PLANET._pos;

        TOKENS.forEach(function(token) {
            token.applyPointGravity(currPlanetPos, 1000);
        });

        ACTORS.forEach(function(actor) {
            actor.applyPointGravity(currPlanetPos, 1000);
        });



        ACTORS.forEach(function(actor) {
        	if (actor._controlledBy !== 'player') {
        		actor.applyNormal(currPlanetPos, 0, {align:true, tangent:true});
        		return;
        	}

            if (actor._isAboveStuff && KEYS_WENT_DOWN[K_SPACE]) { // actor must be on the ground!
                play('boing');
                actor.applyNormal(currPlanetPos, -10000000, {impulse:true});
            }

            var dir = 0;
            if      (KEYS[K_LEFT]) {  dir =  1; }
            else if (KEYS[K_RIGHT]) { dir = -1; }
            else {
                var v = actor.getPosition(true).Copy();
                v.Subtract( CURRENT_PLANET.getPosition(true) );
                v.Normalize();
                v.CrossFV(1);
                var vel = actor._b.GetLinearVelocity();
                var tangVel = compOfAInB(vel, v);

                actor.applyNormal(currPlanetPos, 0, {align:true, tangent:true});
                v.Multiply(-tangVel*50);
                actor._b.ApplyForce( v , actor.getPosition(true) );
            }

            if (dir) {
                actor.applyNormal(currPlanetPos, 1000*dir, {align:true, tangent:true});
            }
        });



        fpsText.attr({text:'FPS: ' + Math.round(1 / DT) });

        //log( 't:', T.toFixed(3), ' dt:', DT.toFixed(3) );
        raf(onFrame);
        PREV_T = T;

        KEYS_WENT_DOWN = {};
        KEYS_WENT_UP   = {};
    };



    /*******************************
     * KEYBOARD AND TOUCH HANDLING *
     *******************************/
    var onKey = function(ev) {
        var kc = ev.keyCode;
        var isDown = (ev.type === 'keydown');
        KEYS[kc] = isDown;
        var o = (isDown ? KEYS_WENT_DOWN : KEYS_WENT_UP);
        o[kc] = true;
        try {
            ev.preventDefault();
        } catch (ex) {}
    };

    // TOUCH INTERFACE
    //log('has touch? ', hasTouch);
    (function() {
        if (hasTouch) {
            var W = SCREEN_DIMS[0];
            var H = SCREEN_DIMS[1];
            var w = W/8;//60;
            var h = w;
            var dt = (W - w*2) / 2;
            dt *= 0.25;

            var leftBtn, rightBtn, jumpBtn;
            var h2 = H-h-dt;
            leftBtn  = s.rect( 0   + dt, h2, w, h);
            rightBtn = s.rect( W-w - dt, h2, w, h);
            jumpBtn  = s.rect((W-w)/2,   h2, w, h);

            var codes = [K_LEFT, K_RIGHT, K_SPACE];

            var onTouch = function(ev) {
                onKey({
                    keyCode: codes[this.idx],
                    type:    ( (ev.type === 'touchend') ? 'keyup' : 'keydown')
                });
            };

            [leftBtn, rightBtn, jumpBtn].forEach(function(el, idx) {
                guiEl.append(el);
                el.attr({fill:'#444', opacity:0.33});
                var cb = onTouch.bind({idx:idx});
                el.touchstart(cb);
                el.touchend(cb);
            });

            window.ontouchstart = function(ev) {
                ev.preventDefault();
            };
        }
        else {
            document.body.classList.add('desktop');
        }
    })();



    var loadLevel = function(levelName) {
        ajax(levelName, function(err, objs) {
            if (err) { return window.alert(err); }

            var autoId = 0;

            objs.forEach(function(o) {
                var visualShape;
                var id = o.id || 'auto' + (autoId++);
                var data = [o.type, id].join(' ');
                if (o.type === 'planet') {
                    visualShape = createShape(o);
                    visualShape._b = createBody({
                        radius:   o.radius,
                        position: o.position,
                        isStatic: true,
                        data:     data
                    });
                    PLANETS.push(visualShape);
                    CURRENT_PLANET = visualShape; // last planet is default
                }
                else if (o.type === 'actor') {
                    visualShape = createShape(o);
                    visualShape._b = createBody({
                        dims:     o.dims,
                        position: o.position,
                        data:     data
                    });
                    ACTORS.push(visualShape);
                }
                else if (o.type === 'token') {
                    visualShape = createShape(o);
                    visualShape._b = createBody({
                        radius:      o.radius,
                        position:    o.position,
                        friction:    1,
                        //restitution: 0,
                        density:     0.1,
                        data:        data
                    });
                    TOKENS.push(visualShape);
                }

                BY_ID[id] = visualShape;

                visualShape.attr({fill:o.color});
            });

            PLAYER = BY_ID['player'];

            // fire processes...
            raf(onFrame);
            window.addEventListener('keydown', onKey);
            window.addEventListener('keyup',   onKey);
            window.addEventListener('resize', onResize);
        });
    };



    preloadSfx(function(err) {
        if (err) { return window.alert(err); }
        //log('DONE LOADING SFX');
        loadLevel('levels/1.json');
    });

})();
