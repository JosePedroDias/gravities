(function() {
    'use strict';



    /***************
     * GLOBAL VARS *
     ***************/
    var SCREEN_DIMS;
    var ENTITIES = [];
    var SHAPES   = [];
    var CURRENT_ENTITY;
    var CURRENT_SHAPE;
    var CURRENT_IDX = -1;



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
        if (o.shape === 'rect') {
            shape = s.rect(-o.dims[0]/2, -o.dims[1]/2, o.dims[0], o.dims[1]); // x, y, w, h
        }
        else if (o.shape === 'circle') {
            shape = s.circle(0, 0, o.radius); // cx, cy, r
        }

        var attrs = {};
        if ('color'   in o) { attrs.fill    = o.color;   }
        if ('opacity' in o) { attrs.opacity = o.opacity; }
        shape.attr(attrs);

        var g = s.g(shape);
        rootEl.append(g);

        var api = {
            el: g,
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
            }
        };

        api._pos = o.position || [0, 0];
        api._rot = o.rotation || 0;
        api.setPosRot();

        return api;
    };



    var QS = function(sel, rootEl) {
        return (rootEl || document).querySelector(sel);
    };

    var QSA = function(sel, rootEl) {
        var els = (rootEl || document).querySelectorAll(sel);
        return Array.prototype.slice.call(els);
    };

    var entitiesEl = QS('#entities');



    var TOOLBAR_STATES = {};

    var ent2props, props2ent, updateEntOption;

    var handleToolbar = function(el) {
        var state = {buttons:[], names:[], length: 0, selected:-1};
        var toolbarName = QS('label', el.parentNode).innerHTML;
        var buttons = QSA('button', el).forEach(function(buttonEl) {
            buttonEl.setAttribute('data-index', state.length);
            state.names.push(buttonEl.innerHTML);
            state.buttons.push(buttonEl);
            ++state.length;
        });
        el.addEventListener('click', function(ev) {
            var buttonEl = ev.target;
            var idx = parseInt(buttonEl.getAttribute('data-index'), 10);
            var name = state.names[idx];
            //console.log(toolbarName, name);
            var cb = state.cb;
            if (cb) {
                var res = cb(name);
                state.selected = ( (res === false) ? -1 : idx);
                state.buttons.forEach(function(buttonEl, currIdx) {
                    buttonEl.className = ( (state.selected === currIdx) ? 'selected' : '');
                });
            }
        });
        TOOLBAR_STATES[toolbarName] = state;
    };
    QSA('.toolbar').forEach(handleToolbar);

    TOOLBAR_STATES.level.cb = function(btnName) {
        alert('TODO level ' + btnName);
        return false;
    };

    TOOLBAR_STATES.tools.cb = function(btnName) {
        if (btnName === 'CREATE') {
            CURRENT_ENTITY = {
                id:        'i' + Math.floor( Math.random() * 1000000 ),
                position:  [40, 60],
                shape:     'rect',
                dims:      [10, 10],
                radius:    10,
                color:     'red',
                opacity:   1,
                type:      'actor'
            };

            ENTITIES.push(CURRENT_ENTITY);
            CURRENT_IDX = ENTITIES.length - 1;

            CURRENT_SHAPE = createShape(CURRENT_ENTITY);
            SHAPES.push(CURRENT_SHAPE);

            ent2props();

            var optionEl = document.createElement('option');
            entitiesEl.appendChild(optionEl);
            updateEntOption();
        }
        else {
            alert('TODO tools ' + btnName);
        }
    };

    TOOLBAR_STATES.entities.cb = function(btnName) {
        alert('TODO entities ' + btnName);
        return false;
    };



    var PROPERTY_FIELDS = {};

    var handleProperty = function(el) {
        var property = {el:el, prevValue:''};
        var name = el.id.split('-')[1];
        el.addEventListener('change', function(ev) {
            //console.log(name, el.value);
            var res = (property.cb ? property.cb(el.value) : el.value);

            if (res === undefined || (typeof res === 'number' && isNaN(res)) ) {
                console.log('REVERTING');
                res = property.prevValue;
            }
            else {
                property.value = res;
                property.prevValue = res;

                CURRENT_ENTITY = props2ent();
                ENTITIES[ CURRENT_IDX ] = CURRENT_ENTITY;

                //console.log('shape update', CURRENT_IDX, JSON.stringify(CURRENT_ENTITY));
                CURRENT_SHAPE.el.remove();
                CURRENT_SHAPE = createShape(CURRENT_ENTITY);
                SHAPES[ CURRENT_IDX ] = CURRENT_SHAPE;
                if (CURRENT_IDX > 0) {
                    CURRENT_SHAPE.el.after( SHAPES[ CURRENT_IDX-1 ].el );
                }

                updateEntOption();
            }

            el.value = (typeof res === 'object') ? res.join(', ') : res;
        });
        property.set = function(val) {
            property.value = val;
            el.value = val;
        };
        PROPERTY_FIELDS[name] = property;
    }
    QSA('*[id^="pro-"]').forEach(handleProperty);

    var secPropertiesEl = QS('#sec-properties');

    var pInt = function(val) {
        return parseInt(val.trim(), 10);
    };
    var pFlt = function(val) {
        return parseFloat(val.trim());
    };
    var pLimitFactory = function(parseFn, m, M) {
        return function(val) {
            val = parseFn(val);
            if (isNaN(val)) { return val; }
            if      (val < m) { val = m; }
            else if (val > M) { val = M; }
            return val;
        };
    };
    var pArrFactory = function(parseFn) {
        return function(val) {
            var arr = val.split(',');
            var failed = false;
            arr = arr.map(function(s) {
                var n = parseFn(s);
                if (isNaN(n)) { failed = true; }
                return n;
            });
            if (failed) { return undefined; }
            return arr;
        };
    };

    var pFlt01  = pLimitFactory(pFlt, 0, 1);
    var pIntArr = pArrFactory(pInt);
    var pFltArr = pArrFactory(pFlt);

    PROPERTY_FIELDS.shape.cb = function(val) {
        secPropertiesEl.className = ['section', 'shape-'+val].join(' ');
        return val;
    };

    PROPERTY_FIELDS.dims.cb     = pIntArr;
    PROPERTY_FIELDS.radius.cb   = pInt;
    PROPERTY_FIELDS.position.cb = pIntArr;
    PROPERTY_FIELDS.opacity.cb  = pFlt01;

    ent2props = function() {
        var k, v, o = CURRENT_ENTITY;
        for (k in o) {
            v = o[k];
            PROPERTY_FIELDS[k].set(v);
        }
        PROPERTY_FIELDS.shape.cb(o.shape);
    };

    props2ent = function() {
        var k, v, o = PROPERTY_FIELDS, ent = {};
        for (k in o) {
            ent[k] = o[k].value;
        }
        return ent;
    };

    updateEntOption = function() {
        var o = CURRENT_ENTITY;
        var optionEl = QSA('option', entitiesEl)[ CURRENT_IDX ];
        optionEl.innerHTML = ['#', o.id, ' (', o.shape , ')'].join('');
        optionEl.value = CURRENT_ENTITY.id;
        QSA('option', entitiesEl)[ CURRENT_IDX ].selected = true;
    };

    /*TODOentitiesEl.addEventListener('change', function(ev) {
        var el = ev.target;
        var els = QSA('option', entitiesEl);
        els = els.map(function(el) {  });
        CURRENT_IDX = els.indexOf(el);
        if (CURRENT_IDX >= 0) {
            ent2props();
        }
    });*/

})();
