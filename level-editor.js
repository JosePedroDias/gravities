(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    var SCREEN_DIMS;
    var ENTITIES = [];



    /****************************
     * VECTOR GRAPHICS WITH SVG *
     ****************************/
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
            getPosition: function() {
                return this._pos;
            },
            getRotation: function() {
                return this._rot;
            },
            remove: function() {
                g.remove();
            }
        };

        api._pos = o.position || [0, 0];
        api._rot = o.rotation || 0;
        api.setPosRot();

        return api;
    };







    var a = createShape({
        position: [150, 75],
        dims:     [30, 20],
    });
    a.attr({fill:'red'});
    ENTITIES.push(a);

    var b = createShape({
        radius: 30,
        position: [75, 150],
    });
    b.attr({fill:'green'});
    ENTITIES.push(b);

})();
