(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    var W = 400;
    var H = 400;

    var DEG2RAD = 180 / Math.PI;
    //var RAD2DEG = Math.PI / 180;

    var     DT = 1 / 30;
    var PREV_T = 0 - DT;
    var      T = 0;

    var KEYS = {};
    var KEYS_WENT_DOWN = {};
    var KEYS_WENT_UP   = {};
    var K_LEFT  = 37;
    var K_RIGHT = 39;
    var K_SPACE = 32;
    /*var K_UP    = 38;
    var K_DOWN  = 40;
    var K_SHIFT = 'SHIFT';
    var K_ALT   = 'ALT';
    var K_CTRL  = 'CTRL';*/



    var Vec2            = Box2D.Common.Math.b2Vec2;
    //var Mat22           = Box2D.Common.Math.b2Mat22;
    //var Transform       = Box2D.Common.Math.b2Transform;
    var World           = Box2D.Dynamics.b2World;
    var BodyDef         = Box2D.Dynamics.b2BodyDef;
    var Body            = Box2D.Dynamics.b2Body;
    var FixtureDef      = Box2D.Dynamics.b2FixtureDef;
    //var ContactListener = Box2D.Dynamics.b2ContactListener;
    var CircleShape     = Box2D.Collision.Shapes.b2CircleShape;
    var PolygonShape    = Box2D.Collision.Shapes.b2PolygonShape;
    //var AABB            = Box2D.Collision.b2AABB;



    var raf = window.requestAnimationFrame       ||
              window.mozRequestAnimationFrame    ||
              window.webkitRequestAnimationFrame ||
              window.msRequestAnimationFrame;

    var log = function() {
        window.console.log.apply(window.console, arguments);
    };

    var trueishKeys = function(o) {
        var res = [];
        for (var k in o) {
            if (o[k]) { res.push(k); }
        }
        return res.join(' ');
    };



    var WORLD = new World( new Vec2(0, 0), true); // gravityVec, doSleep



    /****************************
     * VECTOR GRAPHICS WITH SVG *
     ****************************/
    var S = Snap;
    var s = S(W, H);

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
            }
        };

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



    var planet = createShape({
        radius:   100,
        position: [200, 200]
    });
    planet.attr({fill:'red'});

    var ball = createShape({
        radius: 10
    });
    ball.attr({fill:'blue'});

    var box = createShape({
        dims: [20, 20],
        restitution: 0
    });
    box.attr({fill:'green'});



    createBody({
        radius:   100,
        position: [200, 200],
        isStatic: true,
        data:     'planet'
    });

    ball._b = createBody({
        restitution: 0,
        radius:   10,
        position: [W/4, 10],
        data:     'ball'
    });

    box._b = createBody({
        dims:     [20, 20],
        position: [W*3/4, 10],
        data:     'box'
    });




    var onFrame = function onFrame(t) {
        T = t * 0.001;
        DT = T - PREV_T;

        WORLD.Step(DT*10, 10, 10); // step duration in secs, vel iters, pos iters
        
        WORLD.ClearForces();

        ball.update();
        box.update();

        var boxAboveStuff = false;
        var bp = box.getPosition(true);
        var v = bp.Copy();
        v.Subtract( planet.getPosition(true) );
        v.Normalize();
        v.Multiply(-13);
        v.Add(bp);
        //log(v.x.toFixed(2), v.y.toFixed(2));
        WORLD.QueryPoint(
            function(fixture) {
                //log('point', fixture.GetBody().GetUserData());
                boxAboveStuff = true;
            },
            v
        );



        ball.applyPointGravity(planet._pos, 1000);
         box.applyPointGravity(planet._pos, 1000);

        if (boxAboveStuff && KEYS_WENT_DOWN[K_SPACE]) { // box must be on the ground!
            log('JUMP');
            box.applyNormal(planet._pos, -10000000, {impulse:true});
        }

        var dir = 0;
        if      (KEYS[K_LEFT]) {  dir =  1; }
        else if (KEYS[K_RIGHT]) { dir = -1; }
        box.applyNormal(planet._pos, 1000*dir, {align:true, tangent:true});

        

        fpsText.attr({text:'FPS: ' + Math.round(1 / DT) });

        //log( 't:', T.toFixed(3), ' dt:', DT.toFixed(3) );
        raf(onFrame);
        PREV_T = T;

        KEYS_WENT_DOWN = {};
        KEYS_WENT_UP   = {};
    };
    raf(onFrame);



    /*********************
     * KEYBOARD HANDLING *
     *********************/
    var onKey = function(ev) {
        var kc = ev.keyCode;
        var isDown = (ev.type === 'keydown');
        KEYS[kc] = isDown;

        /*KEYS[K_SHIFT] = ev.shiftKey;
        KEYS[K_ALT]   = ev.altKey;
        KEYS[K_CTRL]  = ev.ctrlKey;*/
        //log('keys:', KEYS);
        //log('keys:', trueishKeys(KEYS));

        var o = (isDown ? KEYS_WENT_DOWN : KEYS_WENT_UP);
        o[kc] = true;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup',   onKey);

})();
