var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_global.js
var require_global = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_global.js"(exports, module2) {
    var global4 = module2.exports = typeof window != "undefined" && window.Math == Math ? window : typeof self != "undefined" && self.Math == Math ? self : Function("return this")();
    if (typeof __g == "number") __g = global4;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_core.js
var require_core = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_core.js"(exports, module2) {
    var core = module2.exports = { version: "2.6.12" };
    if (typeof __e == "number") __e = core;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_is-object.js
var require_is_object = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_is-object.js"(exports, module2) {
    module2.exports = function(it) {
      return typeof it === "object" ? it !== null : typeof it === "function";
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_an-object.js
var require_an_object = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_an-object.js"(exports, module2) {
    var isObject = require_is_object();
    module2.exports = function(it) {
      if (!isObject(it)) throw TypeError(it + " is not an object!");
      return it;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_fails.js
var require_fails = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_fails.js"(exports, module2) {
    module2.exports = function(exec) {
      try {
        return !!exec();
      } catch (e) {
        return true;
      }
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_descriptors.js
var require_descriptors = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_descriptors.js"(exports, module2) {
    module2.exports = !require_fails()(function() {
      return Object.defineProperty({}, "a", { get: function() {
        return 7;
      } }).a != 7;
    });
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_dom-create.js
var require_dom_create = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_dom-create.js"(exports, module2) {
    var isObject = require_is_object();
    var document = require_global().document;
    var is = isObject(document) && isObject(document.createElement);
    module2.exports = function(it) {
      return is ? document.createElement(it) : {};
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_ie8-dom-define.js
var require_ie8_dom_define = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_ie8-dom-define.js"(exports, module2) {
    module2.exports = !require_descriptors() && !require_fails()(function() {
      return Object.defineProperty(require_dom_create()("div"), "a", { get: function() {
        return 7;
      } }).a != 7;
    });
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-primitive.js
var require_to_primitive = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-primitive.js"(exports, module2) {
    var isObject = require_is_object();
    module2.exports = function(it, S3) {
      if (!isObject(it)) return it;
      var fn, val;
      if (S3 && typeof (fn = it.toString) == "function" && !isObject(val = fn.call(it))) return val;
      if (typeof (fn = it.valueOf) == "function" && !isObject(val = fn.call(it))) return val;
      if (!S3 && typeof (fn = it.toString) == "function" && !isObject(val = fn.call(it))) return val;
      throw TypeError("Can't convert object to primitive value");
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-dp.js
var require_object_dp = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-dp.js"(exports) {
    var anObject4 = require_an_object();
    var IE8_DOM_DEFINE = require_ie8_dom_define();
    var toPrimitive = require_to_primitive();
    var dP2 = Object.defineProperty;
    exports.f = require_descriptors() ? Object.defineProperty : function defineProperty(O, P, Attributes) {
      anObject4(O);
      P = toPrimitive(P, true);
      anObject4(Attributes);
      if (IE8_DOM_DEFINE) try {
        return dP2(O, P, Attributes);
      } catch (e) {
      }
      if ("get" in Attributes || "set" in Attributes) throw TypeError("Accessors not supported!");
      if ("value" in Attributes) O[P] = Attributes.value;
      return O;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_property-desc.js
var require_property_desc = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_property-desc.js"(exports, module2) {
    module2.exports = function(bitmap, value) {
      return {
        enumerable: !(bitmap & 1),
        configurable: !(bitmap & 2),
        writable: !(bitmap & 4),
        value
      };
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_hide.js
var require_hide = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_hide.js"(exports, module2) {
    var dP2 = require_object_dp();
    var createDesc = require_property_desc();
    module2.exports = require_descriptors() ? function(object, key2, value) {
      return dP2.f(object, key2, createDesc(1, value));
    } : function(object, key2, value) {
      object[key2] = value;
      return object;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_has.js
var require_has = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_has.js"(exports, module2) {
    var hasOwnProperty = {}.hasOwnProperty;
    module2.exports = function(it, key2) {
      return hasOwnProperty.call(it, key2);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_uid.js
var require_uid = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_uid.js"(exports, module2) {
    var id = 0;
    var px = Math.random();
    module2.exports = function(key2) {
      return "Symbol(".concat(key2 === void 0 ? "" : key2, ")_", (++id + px).toString(36));
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_library.js
var require_library = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_library.js"(exports, module2) {
    module2.exports = false;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_shared.js
var require_shared = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_shared.js"(exports, module2) {
    var core = require_core();
    var global4 = require_global();
    var SHARED = "__core-js_shared__";
    var store = global4[SHARED] || (global4[SHARED] = {});
    (module2.exports = function(key2, value) {
      return store[key2] || (store[key2] = value !== void 0 ? value : {});
    })("versions", []).push({
      version: core.version,
      mode: require_library() ? "pure" : "global",
      copyright: "\xA9 2020 Denis Pushkarev (zloirock.ru)"
    });
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_function-to-string.js
var require_function_to_string = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_function-to-string.js"(exports, module2) {
    module2.exports = require_shared()("native-function-to-string", Function.toString);
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_redefine.js
var require_redefine = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_redefine.js"(exports, module2) {
    var global4 = require_global();
    var hide2 = require_hide();
    var has = require_has();
    var SRC = require_uid()("src");
    var $toString = require_function_to_string();
    var TO_STRING = "toString";
    var TPL = ("" + $toString).split(TO_STRING);
    require_core().inspectSource = function(it) {
      return $toString.call(it);
    };
    (module2.exports = function(O, key2, val, safe) {
      var isFunction = typeof val == "function";
      if (isFunction) has(val, "name") || hide2(val, "name", key2);
      if (O[key2] === val) return;
      if (isFunction) has(val, SRC) || hide2(val, SRC, O[key2] ? "" + O[key2] : TPL.join(String(key2)));
      if (O === global4) {
        O[key2] = val;
      } else if (!safe) {
        delete O[key2];
        hide2(O, key2, val);
      } else if (O[key2]) {
        O[key2] = val;
      } else {
        hide2(O, key2, val);
      }
    })(Function.prototype, TO_STRING, function toString() {
      return typeof this == "function" && this[SRC] || $toString.call(this);
    });
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_a-function.js
var require_a_function = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_a-function.js"(exports, module2) {
    module2.exports = function(it) {
      if (typeof it != "function") throw TypeError(it + " is not a function!");
      return it;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_ctx.js
var require_ctx = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_ctx.js"(exports, module2) {
    var aFunction2 = require_a_function();
    module2.exports = function(fn, that, length) {
      aFunction2(fn);
      if (that === void 0) return fn;
      switch (length) {
        case 1:
          return function(a) {
            return fn.call(that, a);
          };
        case 2:
          return function(a, b) {
            return fn.call(that, a, b);
          };
        case 3:
          return function(a, b, c) {
            return fn.call(that, a, b, c);
          };
      }
      return function() {
        return fn.apply(that, arguments);
      };
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_export.js
var require_export = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_export.js"(exports, module2) {
    var global4 = require_global();
    var core = require_core();
    var hide2 = require_hide();
    var redefine2 = require_redefine();
    var ctx = require_ctx();
    var PROTOTYPE = "prototype";
    var $export5 = function(type, name, source) {
      var IS_FORCED = type & $export5.F;
      var IS_GLOBAL = type & $export5.G;
      var IS_STATIC = type & $export5.S;
      var IS_PROTO = type & $export5.P;
      var IS_BIND = type & $export5.B;
      var target = IS_GLOBAL ? global4 : IS_STATIC ? global4[name] || (global4[name] = {}) : (global4[name] || {})[PROTOTYPE];
      var exports2 = IS_GLOBAL ? core : core[name] || (core[name] = {});
      var expProto = exports2[PROTOTYPE] || (exports2[PROTOTYPE] = {});
      var key2, own, out, exp;
      if (IS_GLOBAL) source = name;
      for (key2 in source) {
        own = !IS_FORCED && target && target[key2] !== void 0;
        out = (own ? target : source)[key2];
        exp = IS_BIND && own ? ctx(out, global4) : IS_PROTO && typeof out == "function" ? ctx(Function.call, out) : out;
        if (target) redefine2(target, key2, out, type & $export5.U);
        if (exports2[key2] != out) hide2(exports2, key2, exp);
        if (IS_PROTO && expProto[key2] != out) expProto[key2] = out;
      }
    };
    global4.core = core;
    $export5.F = 1;
    $export5.G = 2;
    $export5.S = 4;
    $export5.P = 8;
    $export5.B = 16;
    $export5.W = 32;
    $export5.U = 64;
    $export5.R = 128;
    module2.exports = $export5;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_cof.js
var require_cof = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_cof.js"(exports, module2) {
    var toString = {}.toString;
    module2.exports = function(it) {
      return toString.call(it).slice(8, -1);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iobject.js
var require_iobject = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iobject.js"(exports, module2) {
    var cof = require_cof();
    module2.exports = Object("z").propertyIsEnumerable(0) ? Object : function(it) {
      return cof(it) == "String" ? it.split("") : Object(it);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_defined.js
var require_defined = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_defined.js"(exports, module2) {
    module2.exports = function(it) {
      if (it == void 0) throw TypeError("Can't call method on  " + it);
      return it;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-iobject.js
var require_to_iobject = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-iobject.js"(exports, module2) {
    var IObject = require_iobject();
    var defined = require_defined();
    module2.exports = function(it) {
      return IObject(defined(it));
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-integer.js
var require_to_integer = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-integer.js"(exports, module2) {
    var ceil = Math.ceil;
    var floor2 = Math.floor;
    module2.exports = function(it) {
      return isNaN(it = +it) ? 0 : (it > 0 ? floor2 : ceil)(it);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-length.js
var require_to_length = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-length.js"(exports, module2) {
    var toInteger2 = require_to_integer();
    var min2 = Math.min;
    module2.exports = function(it) {
      return it > 0 ? min2(toInteger2(it), 9007199254740991) : 0;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-absolute-index.js
var require_to_absolute_index = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-absolute-index.js"(exports, module2) {
    var toInteger2 = require_to_integer();
    var max2 = Math.max;
    var min2 = Math.min;
    module2.exports = function(index, length) {
      index = toInteger2(index);
      return index < 0 ? max2(index + length, 0) : min2(index, length);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_array-includes.js
var require_array_includes = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_array-includes.js"(exports, module2) {
    var toIObject = require_to_iobject();
    var toLength4 = require_to_length();
    var toAbsoluteIndex = require_to_absolute_index();
    module2.exports = function(IS_INCLUDES) {
      return function($this, el, fromIndex) {
        var O = toIObject($this);
        var length = toLength4(O.length);
        var index = toAbsoluteIndex(fromIndex, length);
        var value;
        if (IS_INCLUDES && el != el) while (length > index) {
          value = O[index++];
          if (value != value) return true;
        }
        else for (; length > index; index++) if (IS_INCLUDES || index in O) {
          if (O[index] === el) return IS_INCLUDES || index || 0;
        }
        return !IS_INCLUDES && -1;
      };
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_strict-method.js
var require_strict_method = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_strict-method.js"(exports, module2) {
    "use strict";
    var fails3 = require_fails();
    module2.exports = function(method, arg) {
      return !!method && fails3(function() {
        arg ? method.call(null, function() {
        }, 1) : method.call(null);
      });
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-object.js
var require_to_object = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_to-object.js"(exports, module2) {
    var defined = require_defined();
    module2.exports = function(it) {
      return Object(defined(it));
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_string-at.js
var require_string_at = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_string-at.js"(exports, module2) {
    var toInteger2 = require_to_integer();
    var defined = require_defined();
    module2.exports = function(TO_STRING) {
      return function(that, pos) {
        var s = String(defined(that));
        var i3 = toInteger2(pos);
        var l = s.length;
        var a, b;
        if (i3 < 0 || i3 >= l) return TO_STRING ? "" : void 0;
        a = s.charCodeAt(i3);
        return a < 55296 || a > 56319 || i3 + 1 === l || (b = s.charCodeAt(i3 + 1)) < 56320 || b > 57343 ? TO_STRING ? s.charAt(i3) : a : TO_STRING ? s.slice(i3, i3 + 2) : (a - 55296 << 10) + (b - 56320) + 65536;
      };
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_advance-string-index.js
var require_advance_string_index = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_advance-string-index.js"(exports, module2) {
    "use strict";
    var at = require_string_at()(true);
    module2.exports = function(S3, index, unicode) {
      return index + (unicode ? at(S3, index).length : 1);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_wks.js
var require_wks = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_wks.js"(exports, module2) {
    var store = require_shared()("wks");
    var uid = require_uid();
    var Symbol2 = require_global().Symbol;
    var USE_SYMBOL = typeof Symbol2 == "function";
    var $exports = module2.exports = function(name) {
      return store[name] || (store[name] = USE_SYMBOL && Symbol2[name] || (USE_SYMBOL ? Symbol2 : uid)("Symbol." + name));
    };
    $exports.store = store;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_classof.js
var require_classof = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_classof.js"(exports, module2) {
    var cof = require_cof();
    var TAG = require_wks()("toStringTag");
    var ARG = cof(/* @__PURE__ */ (function() {
      return arguments;
    })()) == "Arguments";
    var tryGet = function(it, key2) {
      try {
        return it[key2];
      } catch (e) {
      }
    };
    module2.exports = function(it) {
      var O, T3, B;
      return it === void 0 ? "Undefined" : it === null ? "Null" : typeof (T3 = tryGet(O = Object(it), TAG)) == "string" ? T3 : ARG ? cof(O) : (B = cof(O)) == "Object" && typeof O.callee == "function" ? "Arguments" : B;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_regexp-exec-abstract.js
var require_regexp_exec_abstract = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_regexp-exec-abstract.js"(exports, module2) {
    "use strict";
    var classof2 = require_classof();
    var builtinExec = RegExp.prototype.exec;
    module2.exports = function(R, S3) {
      var exec = R.exec;
      if (typeof exec === "function") {
        var result = exec.call(R, S3);
        if (typeof result !== "object") {
          throw new TypeError("RegExp exec method returned something other than an Object or null");
        }
        return result;
      }
      if (classof2(R) !== "RegExp") {
        throw new TypeError("RegExp#exec called on incompatible receiver");
      }
      return builtinExec.call(R, S3);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_flags.js
var require_flags = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_flags.js"(exports, module2) {
    "use strict";
    var anObject4 = require_an_object();
    module2.exports = function() {
      var that = anObject4(this);
      var result = "";
      if (that.global) result += "g";
      if (that.ignoreCase) result += "i";
      if (that.multiline) result += "m";
      if (that.unicode) result += "u";
      if (that.sticky) result += "y";
      return result;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_regexp-exec.js
var require_regexp_exec = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_regexp-exec.js"(exports, module2) {
    "use strict";
    var regexpFlags = require_flags();
    var nativeExec = RegExp.prototype.exec;
    var nativeReplace = String.prototype.replace;
    var patchedExec = nativeExec;
    var LAST_INDEX2 = "lastIndex";
    var UPDATES_LAST_INDEX_WRONG = (function() {
      var re12 = /a/, re22 = /b*/g;
      nativeExec.call(re12, "a");
      nativeExec.call(re22, "a");
      return re12[LAST_INDEX2] !== 0 || re22[LAST_INDEX2] !== 0;
    })();
    var NPCG_INCLUDED = /()??/.exec("")[1] !== void 0;
    var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED;
    if (PATCH) {
      patchedExec = function exec(str) {
        var re = this;
        var lastIndex, reCopy, match, i3;
        if (NPCG_INCLUDED) {
          reCopy = new RegExp("^" + re.source + "$(?!\\s)", regexpFlags.call(re));
        }
        if (UPDATES_LAST_INDEX_WRONG) lastIndex = re[LAST_INDEX2];
        match = nativeExec.call(re, str);
        if (UPDATES_LAST_INDEX_WRONG && match) {
          re[LAST_INDEX2] = re.global ? match.index + match[0].length : lastIndex;
        }
        if (NPCG_INCLUDED && match && match.length > 1) {
          nativeReplace.call(match[0], reCopy, function() {
            for (i3 = 1; i3 < arguments.length - 2; i3++) {
              if (arguments[i3] === void 0) match[i3] = void 0;
            }
          });
        }
        return match;
      };
    }
    module2.exports = patchedExec;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.regexp.exec.js
var require_es6_regexp_exec = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.regexp.exec.js"() {
    "use strict";
    var regexpExec2 = require_regexp_exec();
    require_export()({
      target: "RegExp",
      proto: true,
      forced: regexpExec2 !== /./.exec
    }, {
      exec: regexpExec2
    });
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_fix-re-wks.js
var require_fix_re_wks = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_fix-re-wks.js"(exports, module2) {
    "use strict";
    require_es6_regexp_exec();
    var redefine2 = require_redefine();
    var hide2 = require_hide();
    var fails3 = require_fails();
    var defined = require_defined();
    var wks2 = require_wks();
    var regexpExec2 = require_regexp_exec();
    var SPECIES = wks2("species");
    var REPLACE_SUPPORTS_NAMED_GROUPS = !fails3(function() {
      var re = /./;
      re.exec = function() {
        var result = [];
        result.groups = { a: "7" };
        return result;
      };
      return "".replace(re, "$<a>") !== "7";
    });
    var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = (function() {
      var re = /(?:)/;
      var originalExec = re.exec;
      re.exec = function() {
        return originalExec.apply(this, arguments);
      };
      var result = "ab".split(re);
      return result.length === 2 && result[0] === "a" && result[1] === "b";
    })();
    module2.exports = function(KEY, length, exec) {
      var SYMBOL = wks2(KEY);
      var DELEGATES_TO_SYMBOL = !fails3(function() {
        var O = {};
        O[SYMBOL] = function() {
          return 7;
        };
        return ""[KEY](O) != 7;
      });
      var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL ? !fails3(function() {
        var execCalled = false;
        var re = /a/;
        re.exec = function() {
          execCalled = true;
          return null;
        };
        if (KEY === "split") {
          re.constructor = {};
          re.constructor[SPECIES] = function() {
            return re;
          };
        }
        re[SYMBOL]("");
        return !execCalled;
      }) : void 0;
      if (!DELEGATES_TO_SYMBOL || !DELEGATES_TO_EXEC || KEY === "replace" && !REPLACE_SUPPORTS_NAMED_GROUPS || KEY === "split" && !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC) {
        var nativeRegExpMethod = /./[SYMBOL];
        var fns = exec(
          defined,
          SYMBOL,
          ""[KEY],
          function maybeCallNative(nativeMethod, regexp, str, arg2, forceStringMethod) {
            if (regexp.exec === regexpExec2) {
              if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
                return { done: true, value: nativeRegExpMethod.call(regexp, str, arg2) };
              }
              return { done: true, value: nativeMethod.call(str, regexp, arg2) };
            }
            return { done: false };
          }
        );
        var strfn = fns[0];
        var rxfn = fns[1];
        redefine2(String.prototype, KEY, strfn);
        hide2(
          RegExp.prototype,
          SYMBOL,
          length == 2 ? function(string, arg) {
            return rxfn.call(string, this, arg);
          } : function(string) {
            return rxfn.call(string, this);
          }
        );
      }
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-pie.js
var require_object_pie = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-pie.js"(exports) {
    exports.f = {}.propertyIsEnumerable;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-gopd.js
var require_object_gopd = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-gopd.js"(exports) {
    var pIE = require_object_pie();
    var createDesc = require_property_desc();
    var toIObject = require_to_iobject();
    var toPrimitive = require_to_primitive();
    var has = require_has();
    var IE8_DOM_DEFINE = require_ie8_dom_define();
    var gOPD = Object.getOwnPropertyDescriptor;
    exports.f = require_descriptors() ? gOPD : function getOwnPropertyDescriptor(O, P) {
      O = toIObject(O);
      P = toPrimitive(P, true);
      if (IE8_DOM_DEFINE) try {
        return gOPD(O, P);
      } catch (e) {
      }
      if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_set-proto.js
var require_set_proto = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_set-proto.js"(exports, module2) {
    var isObject = require_is_object();
    var anObject4 = require_an_object();
    var check = function(O, proto3) {
      anObject4(O);
      if (!isObject(proto3) && proto3 !== null) throw TypeError(proto3 + ": can't set as prototype!");
    };
    module2.exports = {
      set: Object.setPrototypeOf || ("__proto__" in {} ? (
        // eslint-disable-line
        (function(test3, buggy, set) {
          try {
            set = require_ctx()(Function.call, require_object_gopd().f(Object.prototype, "__proto__").set, 2);
            set(test3, []);
            buggy = !(test3 instanceof Array);
          } catch (e) {
            buggy = true;
          }
          return function setPrototypeOf(O, proto3) {
            check(O, proto3);
            if (buggy) O.__proto__ = proto3;
            else set(O, proto3);
            return O;
          };
        })({}, false)
      ) : void 0),
      check
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_inherit-if-required.js
var require_inherit_if_required = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_inherit-if-required.js"(exports, module2) {
    var isObject = require_is_object();
    var setPrototypeOf = require_set_proto().set;
    module2.exports = function(that, target, C) {
      var S3 = target.constructor;
      var P;
      if (S3 !== C && typeof S3 == "function" && (P = S3.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
        setPrototypeOf(that, P);
      }
      return that;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_shared-key.js
var require_shared_key = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_shared-key.js"(exports, module2) {
    var shared = require_shared()("keys");
    var uid = require_uid();
    module2.exports = function(key2) {
      return shared[key2] || (shared[key2] = uid(key2));
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-keys-internal.js
var require_object_keys_internal = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-keys-internal.js"(exports, module2) {
    var has = require_has();
    var toIObject = require_to_iobject();
    var arrayIndexOf = require_array_includes()(false);
    var IE_PROTO = require_shared_key()("IE_PROTO");
    module2.exports = function(object, names) {
      var O = toIObject(object);
      var i3 = 0;
      var result = [];
      var key2;
      for (key2 in O) if (key2 != IE_PROTO) has(O, key2) && result.push(key2);
      while (names.length > i3) if (has(O, key2 = names[i3++])) {
        ~arrayIndexOf(result, key2) || result.push(key2);
      }
      return result;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_enum-bug-keys.js
var require_enum_bug_keys = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_enum-bug-keys.js"(exports, module2) {
    module2.exports = "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",");
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-gopn.js
var require_object_gopn = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-gopn.js"(exports) {
    var $keys2 = require_object_keys_internal();
    var hiddenKeys = require_enum_bug_keys().concat("length", "prototype");
    exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
      return $keys2(O, hiddenKeys);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_is-regexp.js
var require_is_regexp = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_is-regexp.js"(exports, module2) {
    var isObject = require_is_object();
    var cof = require_cof();
    var MATCH = require_wks()("match");
    module2.exports = function(it) {
      var isRegExp3;
      return isObject(it) && ((isRegExp3 = it[MATCH]) !== void 0 ? !!isRegExp3 : cof(it) == "RegExp");
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_set-species.js
var require_set_species = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_set-species.js"(exports, module2) {
    "use strict";
    var global4 = require_global();
    var dP2 = require_object_dp();
    var DESCRIPTORS = require_descriptors();
    var SPECIES = require_wks()("species");
    module2.exports = function(KEY) {
      var C = global4[KEY];
      if (DESCRIPTORS && C && !C[SPECIES]) dP2.f(C, SPECIES, {
        configurable: true,
        get: function() {
          return this;
        }
      });
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_species-constructor.js
var require_species_constructor = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_species-constructor.js"(exports, module2) {
    var anObject4 = require_an_object();
    var aFunction2 = require_a_function();
    var SPECIES = require_wks()("species");
    module2.exports = function(O, D) {
      var C = anObject4(O).constructor;
      var S3;
      return C === void 0 || (S3 = anObject4(C)[SPECIES]) == void 0 ? D : aFunction2(S3);
    };
  }
});

// node_modules/.pnpm/punycode@1.4.1/node_modules/punycode/punycode.js
var require_punycode = __commonJS({
  "node_modules/.pnpm/punycode@1.4.1/node_modules/punycode/punycode.js"(exports, module2) {
    (function(root) {
      var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
      var freeModule = typeof module2 == "object" && module2 && !module2.nodeType && module2;
      var freeGlobal = typeof global == "object" && global;
      if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
        root = freeGlobal;
      }
      var punycode2, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
        "overflow": "Overflow: input needs wider integers to process",
        "not-basic": "Illegal input >= 0x80 (not a basic code point)",
        "invalid-input": "Invalid input"
      }, baseMinusTMin = base - tMin, floor2 = Math.floor, stringFromCharCode = String.fromCharCode, key2;
      function error(type) {
        throw new RangeError(errors[type]);
      }
      function map(array, fn) {
        var length = array.length;
        var result = [];
        while (length--) {
          result[length] = fn(array[length]);
        }
        return result;
      }
      function mapDomain(string, fn) {
        var parts = string.split("@");
        var result = "";
        if (parts.length > 1) {
          result = parts[0] + "@";
          string = parts[1];
        }
        string = string.replace(regexSeparators, ".");
        var labels = string.split(".");
        var encoded = map(labels, fn).join(".");
        return result + encoded;
      }
      function ucs2decode(string) {
        var output = [], counter = 0, length = string.length, value, extra;
        while (counter < length) {
          value = string.charCodeAt(counter++);
          if (value >= 55296 && value <= 56319 && counter < length) {
            extra = string.charCodeAt(counter++);
            if ((extra & 64512) == 56320) {
              output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
            } else {
              output.push(value);
              counter--;
            }
          } else {
            output.push(value);
          }
        }
        return output;
      }
      function ucs2encode(array) {
        return map(array, function(value) {
          var output = "";
          if (value > 65535) {
            value -= 65536;
            output += stringFromCharCode(value >>> 10 & 1023 | 55296);
            value = 56320 | value & 1023;
          }
          output += stringFromCharCode(value);
          return output;
        }).join("");
      }
      function basicToDigit(codePoint) {
        if (codePoint - 48 < 10) {
          return codePoint - 22;
        }
        if (codePoint - 65 < 26) {
          return codePoint - 65;
        }
        if (codePoint - 97 < 26) {
          return codePoint - 97;
        }
        return base;
      }
      function digitToBasic(digit, flag) {
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
      }
      function adapt(delta, numPoints, firstTime) {
        var k = 0;
        delta = firstTime ? floor2(delta / damp) : delta >> 1;
        delta += floor2(delta / numPoints);
        for (; delta > baseMinusTMin * tMax >> 1; k += base) {
          delta = floor2(delta / baseMinusTMin);
        }
        return floor2(k + (baseMinusTMin + 1) * delta / (delta + skew));
      }
      function decode(input) {
        var output = [], inputLength = input.length, out, i3 = 0, n2 = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
        basic = input.lastIndexOf(delimiter);
        if (basic < 0) {
          basic = 0;
        }
        for (j = 0; j < basic; ++j) {
          if (input.charCodeAt(j) >= 128) {
            error("not-basic");
          }
          output.push(input.charCodeAt(j));
        }
        for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
          for (oldi = i3, w = 1, k = base; ; k += base) {
            if (index >= inputLength) {
              error("invalid-input");
            }
            digit = basicToDigit(input.charCodeAt(index++));
            if (digit >= base || digit > floor2((maxInt - i3) / w)) {
              error("overflow");
            }
            i3 += digit * w;
            t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
            if (digit < t) {
              break;
            }
            baseMinusT = base - t;
            if (w > floor2(maxInt / baseMinusT)) {
              error("overflow");
            }
            w *= baseMinusT;
          }
          out = output.length + 1;
          bias = adapt(i3 - oldi, out, oldi == 0);
          if (floor2(i3 / out) > maxInt - n2) {
            error("overflow");
          }
          n2 += floor2(i3 / out);
          i3 %= out;
          output.splice(i3++, 0, n2);
        }
        return ucs2encode(output);
      }
      function encode(input) {
        var n2, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
        input = ucs2decode(input);
        inputLength = input.length;
        n2 = initialN;
        delta = 0;
        bias = initialBias;
        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue < 128) {
            output.push(stringFromCharCode(currentValue));
          }
        }
        handledCPCount = basicLength = output.length;
        if (basicLength) {
          output.push(delimiter);
        }
        while (handledCPCount < inputLength) {
          for (m = maxInt, j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue >= n2 && currentValue < m) {
              m = currentValue;
            }
          }
          handledCPCountPlusOne = handledCPCount + 1;
          if (m - n2 > floor2((maxInt - delta) / handledCPCountPlusOne)) {
            error("overflow");
          }
          delta += (m - n2) * handledCPCountPlusOne;
          n2 = m;
          for (j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue < n2 && ++delta > maxInt) {
              error("overflow");
            }
            if (currentValue == n2) {
              for (q = delta, k = base; ; k += base) {
                t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                if (q < t) {
                  break;
                }
                qMinusT = q - t;
                baseMinusT = base - t;
                output.push(
                  stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                );
                q = floor2(qMinusT / baseMinusT);
              }
              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }
          ++delta;
          ++n2;
        }
        return output.join("");
      }
      function toUnicode(input) {
        return mapDomain(input, function(string) {
          return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
        });
      }
      function toASCII(input) {
        return mapDomain(input, function(string) {
          return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
        });
      }
      punycode2 = {
        /**
         * A string representing the current Punycode.js version number.
         * @memberOf punycode
         * @type String
         */
        "version": "1.4.1",
        /**
         * An object of methods to convert from JavaScript's internal character
         * representation (UCS-2) to Unicode code points, and back.
         * @see <https://mathiasbynens.be/notes/javascript-encoding>
         * @memberOf punycode
         * @type Object
         */
        "ucs2": {
          "decode": ucs2decode,
          "encode": ucs2encode
        },
        "decode": decode,
        "encode": encode,
        "toASCII": toASCII,
        "toUnicode": toUnicode
      };
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        define("punycode", function() {
          return punycode2;
        });
      } else if (freeExports && freeModule) {
        if (module2.exports == freeExports) {
          freeModule.exports = punycode2;
        } else {
          for (key2 in punycode2) {
            punycode2.hasOwnProperty(key2) && (freeExports[key2] = punycode2[key2]);
          }
        }
      } else {
        root.punycode = punycode2;
      }
    })(exports);
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_array-reduce.js
var require_array_reduce = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_array-reduce.js"(exports, module2) {
    var aFunction2 = require_a_function();
    var toObject4 = require_to_object();
    var IObject = require_iobject();
    var toLength4 = require_to_length();
    module2.exports = function(that, callbackfn, aLen, memo, isRight) {
      aFunction2(callbackfn);
      var O = toObject4(that);
      var self2 = IObject(O);
      var length = toLength4(O.length);
      var index = isRight ? length - 1 : 0;
      var i3 = isRight ? -1 : 1;
      if (aLen < 2) for (; ; ) {
        if (index in self2) {
          memo = self2[index];
          index += i3;
          break;
        }
        index += i3;
        if (isRight ? index < 0 : length <= index) {
          throw TypeError("Reduce of empty array with no initial value");
        }
      }
      for (; isRight ? index >= 0 : length > index; index += i3) if (index in self2) {
        memo = callbackfn(memo, self2[index], index, O);
      }
      return memo;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_add-to-unscopables.js
var require_add_to_unscopables = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_add-to-unscopables.js"(exports, module2) {
    var UNSCOPABLES = require_wks()("unscopables");
    var ArrayProto = Array.prototype;
    if (ArrayProto[UNSCOPABLES] == void 0) require_hide()(ArrayProto, UNSCOPABLES, {});
    module2.exports = function(key2) {
      ArrayProto[UNSCOPABLES][key2] = true;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iter-step.js
var require_iter_step = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iter-step.js"(exports, module2) {
    module2.exports = function(done, value) {
      return { value, done: !!done };
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iterators.js
var require_iterators = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iterators.js"(exports, module2) {
    module2.exports = {};
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-keys.js
var require_object_keys = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-keys.js"(exports, module2) {
    var $keys2 = require_object_keys_internal();
    var enumBugKeys = require_enum_bug_keys();
    module2.exports = Object.keys || function keys2(O) {
      return $keys2(O, enumBugKeys);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-dps.js
var require_object_dps = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-dps.js"(exports, module2) {
    var dP2 = require_object_dp();
    var anObject4 = require_an_object();
    var getKeys2 = require_object_keys();
    module2.exports = require_descriptors() ? Object.defineProperties : function defineProperties(O, Properties) {
      anObject4(O);
      var keys2 = getKeys2(Properties);
      var length = keys2.length;
      var i3 = 0;
      var P;
      while (length > i3) dP2.f(O, P = keys2[i3++], Properties[P]);
      return O;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_html.js
var require_html = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_html.js"(exports, module2) {
    var document = require_global().document;
    module2.exports = document && document.documentElement;
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-create.js
var require_object_create = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-create.js"(exports, module2) {
    var anObject4 = require_an_object();
    var dPs = require_object_dps();
    var enumBugKeys = require_enum_bug_keys();
    var IE_PROTO = require_shared_key()("IE_PROTO");
    var Empty = function() {
    };
    var PROTOTYPE = "prototype";
    var createDict = function() {
      var iframe = require_dom_create()("iframe");
      var i3 = enumBugKeys.length;
      var lt = "<";
      var gt = ">";
      var iframeDocument;
      iframe.style.display = "none";
      require_html().appendChild(iframe);
      iframe.src = "javascript:";
      iframeDocument = iframe.contentWindow.document;
      iframeDocument.open();
      iframeDocument.write(lt + "script" + gt + "document.F=Object" + lt + "/script" + gt);
      iframeDocument.close();
      createDict = iframeDocument.F;
      while (i3--) delete createDict[PROTOTYPE][enumBugKeys[i3]];
      return createDict();
    };
    module2.exports = Object.create || function create(O, Properties) {
      var result;
      if (O !== null) {
        Empty[PROTOTYPE] = anObject4(O);
        result = new Empty();
        Empty[PROTOTYPE] = null;
        result[IE_PROTO] = O;
      } else result = createDict();
      return Properties === void 0 ? result : dPs(result, Properties);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_set-to-string-tag.js
var require_set_to_string_tag = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_set-to-string-tag.js"(exports, module2) {
    var def = require_object_dp().f;
    var has = require_has();
    var TAG = require_wks()("toStringTag");
    module2.exports = function(it, tag, stat) {
      if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, { configurable: true, value: tag });
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iter-create.js
var require_iter_create = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iter-create.js"(exports, module2) {
    "use strict";
    var create = require_object_create();
    var descriptor = require_property_desc();
    var setToStringTag = require_set_to_string_tag();
    var IteratorPrototype = {};
    require_hide()(IteratorPrototype, require_wks()("iterator"), function() {
      return this;
    });
    module2.exports = function(Constructor, NAME2, next) {
      Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
      setToStringTag(Constructor, NAME2 + " Iterator");
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-gpo.js
var require_object_gpo = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-gpo.js"(exports, module2) {
    var has = require_has();
    var toObject4 = require_to_object();
    var IE_PROTO = require_shared_key()("IE_PROTO");
    var ObjectProto = Object.prototype;
    module2.exports = Object.getPrototypeOf || function(O) {
      O = toObject4(O);
      if (has(O, IE_PROTO)) return O[IE_PROTO];
      if (typeof O.constructor == "function" && O instanceof O.constructor) {
        return O.constructor.prototype;
      }
      return O instanceof Object ? ObjectProto : null;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iter-define.js
var require_iter_define = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_iter-define.js"(exports, module2) {
    "use strict";
    var LIBRARY = require_library();
    var $export5 = require_export();
    var redefine2 = require_redefine();
    var hide2 = require_hide();
    var Iterators2 = require_iterators();
    var $iterCreate = require_iter_create();
    var setToStringTag = require_set_to_string_tag();
    var getPrototypeOf = require_object_gpo();
    var ITERATOR2 = require_wks()("iterator");
    var BUGGY = !([].keys && "next" in [].keys());
    var FF_ITERATOR = "@@iterator";
    var KEYS = "keys";
    var VALUES = "values";
    var returnThis = function() {
      return this;
    };
    module2.exports = function(Base3, NAME2, Constructor, next, DEFAULT, IS_SET, FORCED) {
      $iterCreate(Constructor, NAME2, next);
      var getMethod = function(kind) {
        if (!BUGGY && kind in proto3) return proto3[kind];
        switch (kind) {
          case KEYS:
            return function keys2() {
              return new Constructor(this, kind);
            };
          case VALUES:
            return function values() {
              return new Constructor(this, kind);
            };
        }
        return function entries() {
          return new Constructor(this, kind);
        };
      };
      var TAG = NAME2 + " Iterator";
      var DEF_VALUES = DEFAULT == VALUES;
      var VALUES_BUG = false;
      var proto3 = Base3.prototype;
      var $native2 = proto3[ITERATOR2] || proto3[FF_ITERATOR] || DEFAULT && proto3[DEFAULT];
      var $default = $native2 || getMethod(DEFAULT);
      var $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod("entries") : void 0;
      var $anyNative = NAME2 == "Array" ? proto3.entries || $native2 : $native2;
      var methods, key2, IteratorPrototype;
      if ($anyNative) {
        IteratorPrototype = getPrototypeOf($anyNative.call(new Base3()));
        if (IteratorPrototype !== Object.prototype && IteratorPrototype.next) {
          setToStringTag(IteratorPrototype, TAG, true);
          if (!LIBRARY && typeof IteratorPrototype[ITERATOR2] != "function") hide2(IteratorPrototype, ITERATOR2, returnThis);
        }
      }
      if (DEF_VALUES && $native2 && $native2.name !== VALUES) {
        VALUES_BUG = true;
        $default = function values() {
          return $native2.call(this);
        };
      }
      if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto3[ITERATOR2])) {
        hide2(proto3, ITERATOR2, $default);
      }
      Iterators2[NAME2] = $default;
      Iterators2[TAG] = returnThis;
      if (DEFAULT) {
        methods = {
          values: DEF_VALUES ? $default : getMethod(VALUES),
          keys: IS_SET ? $default : getMethod(KEYS),
          entries: $entries
        };
        if (FORCED) for (key2 in methods) {
          if (!(key2 in proto3)) redefine2(proto3, key2, methods[key2]);
        }
        else $export5($export5.P + $export5.F * (BUGGY || VALUES_BUG), NAME2, methods);
      }
      return methods;
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.array.iterator.js
var require_es6_array_iterator = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.array.iterator.js"(exports, module2) {
    "use strict";
    var addToUnscopables = require_add_to_unscopables();
    var step = require_iter_step();
    var Iterators2 = require_iterators();
    var toIObject = require_to_iobject();
    module2.exports = require_iter_define()(Array, "Array", function(iterated, kind) {
      this._t = toIObject(iterated);
      this._i = 0;
      this._k = kind;
    }, function() {
      var O = this._t;
      var kind = this._k;
      var index = this._i++;
      if (!O || index >= O.length) {
        this._t = void 0;
        return step(1);
      }
      if (kind == "keys") return step(0, index);
      if (kind == "values") return step(0, O[index]);
      return step(0, [index, O[index]]);
    }, "values");
    Iterators2.Arguments = Iterators2.Array;
    addToUnscopables("keys");
    addToUnscopables("values");
    addToUnscopables("entries");
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-sap.js
var require_object_sap = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_object-sap.js"(exports, module2) {
    var $export5 = require_export();
    var core = require_core();
    var fails3 = require_fails();
    module2.exports = function(KEY, exec) {
      var fn = (core.Object || {})[KEY] || Object[KEY];
      var exp = {};
      exp[KEY] = exec(fn);
      $export5($export5.S + $export5.F * fails3(function() {
        fn(1);
      }), "Object", exp);
    };
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_is-array.js
var require_is_array = __commonJS({
  "node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/_is-array.js"(exports, module2) {
    var cof = require_cof();
    module2.exports = Array.isArray || function isArray(arg) {
      return cof(arg) == "Array";
    };
  }
});

// node_modules/.pnpm/twemoji-parser@11.0.2/node_modules/twemoji-parser/dist/lib/regex.js
var require_regex = __commonJS({
  "node_modules/.pnpm/twemoji-parser@11.0.2/node_modules/twemoji-parser/dist/lib/regex.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = /(?:\ud83d[\udc68\udc69])(?:\ud83c[\udffb-\udfff])?\u200d(?:\u2695\ufe0f|\u2696\ufe0f|\u2708\ufe0f|\ud83c[\udf3e\udf73\udf93\udfa4\udfa8\udfeb\udfed]|\ud83d[\udcbb\udcbc\udd27\udd2c\ude80\ude92]|\ud83e[\uddb0-\uddb3])|(?:\ud83c[\udfcb\udfcc]|\ud83d[\udd74\udd75]|\u26f9)((?:\ud83c[\udffb-\udfff]|\ufe0f)\u200d[\u2640\u2642]\ufe0f)|(?:\ud83c[\udfc3\udfc4\udfca]|\ud83d[\udc6e\udc71\udc73\udc77\udc81\udc82\udc86\udc87\ude45-\ude47\ude4b\ude4d\ude4e\udea3\udeb4-\udeb6]|\ud83e[\udd26\udd35\udd37-\udd39\udd3d\udd3e\uddb8\uddb9\uddd6-\udddd])(?:\ud83c[\udffb-\udfff])?\u200d[\u2640\u2642]\ufe0f|(?:\ud83d\udc68\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d[\udc68\udc69]|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\u2764\ufe0f\u200d\ud83d\udc68|\ud83d\udc68\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d[\udc68\udc69]|\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83c\udff3\ufe0f\u200d\ud83c\udf08|\ud83c\udff4\u200d\u2620\ufe0f|\ud83d\udc41\u200d\ud83d\udde8|\ud83d\udc68\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83d\udc6f\u200d\u2640\ufe0f|\ud83d\udc6f\u200d\u2642\ufe0f|\ud83e\udd3c\u200d\u2640\ufe0f|\ud83e\udd3c\u200d\u2642\ufe0f|\ud83e\uddde\u200d\u2640\ufe0f|\ud83e\uddde\u200d\u2642\ufe0f|\ud83e\udddf\u200d\u2640\ufe0f|\ud83e\udddf\u200d\u2642\ufe0f)|[#*0-9]\ufe0f?\u20e3|(?:[©®\u2122\u265f]\ufe0f)|(?:\ud83c[\udc04\udd70\udd71\udd7e\udd7f\ude02\ude1a\ude2f\ude37\udf21\udf24-\udf2c\udf36\udf7d\udf96\udf97\udf99-\udf9b\udf9e\udf9f\udfcd\udfce\udfd4-\udfdf\udff3\udff5\udff7]|\ud83d[\udc3f\udc41\udcfd\udd49\udd4a\udd6f\udd70\udd73\udd76-\udd79\udd87\udd8a-\udd8d\udda5\udda8\uddb1\uddb2\uddbc\uddc2-\uddc4\uddd1-\uddd3\udddc-\uddde\udde1\udde3\udde8\uddef\uddf3\uddfa\udecb\udecd-\udecf\udee0-\udee5\udee9\udef0\udef3]|[\u203c\u2049\u2139\u2194-\u2199\u21a9\u21aa\u231a\u231b\u2328\u23cf\u23ed-\u23ef\u23f1\u23f2\u23f8-\u23fa\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600-\u2604\u260e\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262a\u262e\u262f\u2638-\u263a\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267b\u267f\u2692-\u2697\u2699\u269b\u269c\u26a0\u26a1\u26aa\u26ab\u26b0\u26b1\u26bd\u26be\u26c4\u26c5\u26c8\u26cf\u26d1\u26d3\u26d4\u26e9\u26ea\u26f0-\u26f5\u26f8\u26fa\u26fd\u2702\u2708\u2709\u270f\u2712\u2714\u2716\u271d\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u2764\u27a1\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299])(?:\ufe0f|(?!\ufe0e))|(?:(?:\ud83c[\udfcb\udfcc]|\ud83d[\udd74\udd75\udd90]|[\u261d\u26f7\u26f9\u270c\u270d])(?:\ufe0f|(?!\ufe0e))|(?:\ud83c[\udf85\udfc2-\udfc4\udfc7\udfca]|\ud83d[\udc42\udc43\udc46-\udc50\udc66-\udc69\udc6e\udc70-\udc78\udc7c\udc81-\udc83\udc85-\udc87\udcaa\udd7a\udd95\udd96\ude45-\ude47\ude4b-\ude4f\udea3\udeb4-\udeb6\udec0\udecc]|\ud83e[\udd18-\udd1c\udd1e\udd1f\udd26\udd30-\udd39\udd3d\udd3e\uddb5\uddb6\uddb8\uddb9\uddd1-\udddd]|[\u270a\u270b]))(?:\ud83c[\udffb-\udfff])?|(?:\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc65\udb40\udc6e\udb40\udc67\udb40\udc7f|\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc73\udb40\udc63\udb40\udc74\udb40\udc7f|\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc77\udb40\udc6c\udb40\udc73\udb40\udc7f|\ud83c\udde6\ud83c[\udde8-\uddec\uddee\uddf1\uddf2\uddf4\uddf6-\uddfa\uddfc\uddfd\uddff]|\ud83c\udde7\ud83c[\udde6\udde7\udde9-\uddef\uddf1-\uddf4\uddf6-\uddf9\uddfb\uddfc\uddfe\uddff]|\ud83c\udde8\ud83c[\udde6\udde8\udde9\uddeb-\uddee\uddf0-\uddf5\uddf7\uddfa-\uddff]|\ud83c\udde9\ud83c[\uddea\uddec\uddef\uddf0\uddf2\uddf4\uddff]|\ud83c\uddea\ud83c[\udde6\udde8\uddea\uddec\udded\uddf7-\uddfa]|\ud83c\uddeb\ud83c[\uddee-\uddf0\uddf2\uddf4\uddf7]|\ud83c\uddec\ud83c[\udde6\udde7\udde9-\uddee\uddf1-\uddf3\uddf5-\uddfa\uddfc\uddfe]|\ud83c\udded\ud83c[\uddf0\uddf2\uddf3\uddf7\uddf9\uddfa]|\ud83c\uddee\ud83c[\udde8-\uddea\uddf1-\uddf4\uddf6-\uddf9]|\ud83c\uddef\ud83c[\uddea\uddf2\uddf4\uddf5]|\ud83c\uddf0\ud83c[\uddea\uddec-\uddee\uddf2\uddf3\uddf5\uddf7\uddfc\uddfe\uddff]|\ud83c\uddf1\ud83c[\udde6-\udde8\uddee\uddf0\uddf7-\uddfb\uddfe]|\ud83c\uddf2\ud83c[\udde6\udde8-\udded\uddf0-\uddff]|\ud83c\uddf3\ud83c[\udde6\udde8\uddea-\uddec\uddee\uddf1\uddf4\uddf5\uddf7\uddfa\uddff]|\ud83c\uddf4\ud83c\uddf2|\ud83c\uddf5\ud83c[\udde6\uddea-\udded\uddf0-\uddf3\uddf7-\uddf9\uddfc\uddfe]|\ud83c\uddf6\ud83c\udde6|\ud83c\uddf7\ud83c[\uddea\uddf4\uddf8\uddfa\uddfc]|\ud83c\uddf8\ud83c[\udde6-\uddea\uddec-\uddf4\uddf7-\uddf9\uddfb\uddfd-\uddff]|\ud83c\uddf9\ud83c[\udde6\udde8\udde9\uddeb-\udded\uddef-\uddf4\uddf7\uddf9\uddfb\uddfc\uddff]|\ud83c\uddfa\ud83c[\udde6\uddec\uddf2\uddf3\uddf8\uddfe\uddff]|\ud83c\uddfb\ud83c[\udde6\udde8\uddea\uddec\uddee\uddf3\uddfa]|\ud83c\uddfc\ud83c[\uddeb\uddf8]|\ud83c\uddfd\ud83c\uddf0|\ud83c\uddfe\ud83c[\uddea\uddf9]|\ud83c\uddff\ud83c[\udde6\uddf2\uddfc]|\ud83c[\udccf\udd8e\udd91-\udd9a\udde6-\uddff\ude01\ude32-\ude36\ude38-\ude3a\ude50\ude51\udf00-\udf20\udf2d-\udf35\udf37-\udf7c\udf7e-\udf84\udf86-\udf93\udfa0-\udfc1\udfc5\udfc6\udfc8\udfc9\udfcf-\udfd3\udfe0-\udff0\udff4\udff8-\udfff]|\ud83d[\udc00-\udc3e\udc40\udc44\udc45\udc51-\udc65\udc6a-\udc6d\udc6f\udc79-\udc7b\udc7d-\udc80\udc84\udc88-\udca9\udcab-\udcfc\udcff-\udd3d\udd4b-\udd4e\udd50-\udd67\udda4\uddfb-\ude44\ude48-\ude4a\ude80-\udea2\udea4-\udeb3\udeb7-\udebf\udec1-\udec5\uded0-\uded2\udeeb\udeec\udef4-\udef9]|\ud83e[\udd10-\udd17\udd1d\udd20-\udd25\udd27-\udd2f\udd3a\udd3c\udd40-\udd45\udd47-\udd70\udd73-\udd76\udd7a\udd7c-\udda2\uddb4\uddb7\uddc0-\uddc2\uddd0\uddde-\uddff]|[\u23e9-\u23ec\u23f0\u23f3\u267e\u26ce\u2705\u2728\u274c\u274e\u2753-\u2755\u2795-\u2797\u27b0\u27bf\ue50a])|\ufe0f/g;
  }
});

// node_modules/.pnpm/twemoji-parser@11.0.2/node_modules/twemoji-parser/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/twemoji-parser@11.0.2/node_modules/twemoji-parser/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.TypeName = void 0;
    exports.parse = parse;
    exports.toCodePoints = toCodePoints;
    var _regex = require_regex();
    var _regex2 = _interopRequireDefault(_regex);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var TypeName = exports.TypeName = "emoji";
    function parse(text, options) {
      var assetType = options && options.assetType ? options.assetType : "svg";
      var getTwemojiUrl = options && options.buildUrl ? options.buildUrl : function(codepoints2, assetType2) {
        return assetType2 === "png" ? "https://twemoji.maxcdn.com/2/72x72/" + codepoints2 + ".png" : "https://twemoji.maxcdn.com/2/svg/" + codepoints2 + ".svg";
      };
      var entities = [];
      _regex2.default.lastIndex = 0;
      while (true) {
        var result = _regex2.default.exec(text);
        if (!result) {
          break;
        }
        var emojiText = result[0];
        var codepoints = toCodePoints(removeVS16s(emojiText)).join("-");
        entities.push({
          url: codepoints ? getTwemojiUrl(codepoints, assetType) : "",
          indices: [result.index, _regex2.default.lastIndex],
          text: emojiText,
          type: TypeName
        });
      }
      return entities;
    }
    var vs16RegExp = /\uFE0F/g;
    var zeroWidthJoiner = String.fromCharCode(8205);
    var removeVS16s = function removeVS16s2(rawEmoji) {
      return rawEmoji.indexOf(zeroWidthJoiner) < 0 ? rawEmoji.replace(vs16RegExp, "") : rawEmoji;
    };
    function toCodePoints(unicodeSurrogates) {
      var points = [];
      var char = 0;
      var previous = 0;
      var i3 = 0;
      while (i3 < unicodeSurrogates.length) {
        char = unicodeSurrogates.charCodeAt(i3++);
        if (previous) {
          points.push((65536 + (previous - 55296 << 10) + (char - 56320)).toString(16));
          previous = 0;
        } else if (char > 55296 && char <= 56319) {
          previous = char;
        } else {
          points.push(char.toString(16));
        }
      }
      return points;
    }
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NoteTweet
});
module.exports = __toCommonJS(main_exports);
var import_obsidian9 = require("obsidian");

// src/secrets.ts
var LEGACY_TWITTER_SECRET_IDS = {
  apiKey: "notetweet-api-key",
  apiSecret: "notetweet-api-secret",
  accessToken: "notetweet-access-token",
  accessTokenSecret: "notetweet-access-token-secret"
};
var SECRET_IDS = {
  schedulerPassword: "notetweet-scheduler-password"
};
var SECRET_ID_MAX_LENGTH = 64;
var ACCOUNT_SECRET_PREFIX = "notetweet-account";
var ACCOUNT_SECRET_SUFFIX = {
  apiKey: "api-key",
  apiSecret: "api-secret",
  accessToken: "access-token",
  accessTokenSecret: "access-token-secret"
};
var MAX_ACCOUNT_ID_LENGTH = SECRET_ID_MAX_LENGTH - ACCOUNT_SECRET_PREFIX.length - 2 - Math.max(...Object.values(ACCOUNT_SECRET_SUFFIX).map(({ length }) => length));
function hasSecretStorage(app) {
  const storage = app.secretStorage;
  return !!storage && typeof storage.getSecret === "function" && typeof storage.setSecret === "function";
}
function getSecret(app, id) {
  try {
    return app.secretStorage?.getSecret(id) ?? "";
  } catch {
    return "";
  }
}
function setSecret(app, id, value) {
  app.secretStorage?.setSecret(id, value);
}
var TWITTER_CREDENTIAL_FIELDS = Object.keys(
  ACCOUNT_SECRET_SUFFIX
);
function accountSecretId(accountId, field) {
  return `${ACCOUNT_SECRET_PREFIX}-${accountId}-${ACCOUNT_SECRET_SUFFIX[field]}`;
}
function getAccountCredentials(app, accountId) {
  return {
    apiKey: getSecret(app, accountSecretId(accountId, "apiKey")),
    apiSecret: getSecret(app, accountSecretId(accountId, "apiSecret")),
    accessToken: getSecret(app, accountSecretId(accountId, "accessToken")),
    accessTokenSecret: getSecret(
      app,
      accountSecretId(accountId, "accessTokenSecret")
    )
  };
}
function setAccountCredentials(app, accountId, credentials) {
  for (const field of TWITTER_CREDENTIAL_FIELDS) {
    setSecret(app, accountSecretId(accountId, field), credentials[field]);
  }
}
function clearAccountCredentials(app, accountId) {
  setAccountCredentials(app, accountId, {
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    accessTokenSecret: ""
  });
}
function hasCompleteCredentials(credentials) {
  return Boolean(
    credentials.apiKey && credentials.apiSecret && credentials.accessToken && credentials.accessTokenSecret
  );
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  accounts: [],
  defaultAccountId: "",
  postTweetTag: "",
  autoSplitTweets: true,
  soundEffects: true,
  scheduling: {
    enabled: false,
    url: ""
  }
};
var ACCOUNT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var ACCOUNT_ID_BYTES = 12;
function normalizeAccountSettings(settings) {
  const seen = /* @__PURE__ */ new Set();
  settings.accounts = Array.isArray(settings.accounts) ? settings.accounts.filter((account) => {
    if (!account || typeof account.id !== "string" || account.id.length > MAX_ACCOUNT_ID_LENGTH || !ACCOUNT_ID.test(account.id) || typeof account.name !== "string" || account.name.trim() === "" || seen.has(account.id)) {
      return false;
    }
    seen.add(account.id);
    account.name = account.name.trim();
    return true;
  }) : [];
  if (!seen.has(settings.defaultAccountId)) {
    settings.defaultAccountId = settings.accounts[0]?.id ?? "";
  }
}
function createAccount(name) {
  const bytes = crypto.getRandomValues(new Uint8Array(ACCOUNT_ID_BYTES));
  const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
  return { id, name: name.trim() };
}

// src/settingsTab.ts
var import_obsidian5 = require("obsidian");

// src/log.ts
var import_obsidian = require("obsidian");
var PREFIX = "NoteTweet";
var ERROR_NOTICE_MS = 1e4;
var log = {
  error(message) {
    new import_obsidian.Notice(`${PREFIX}: ${message}`, ERROR_NOTICE_MS);
  },
  warning(message) {
    new import_obsidian.Notice(`${PREFIX}: ${message}`);
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/core.js
var crypto2 = (typeof globalThis != "undefined" ? globalThis : void 0)?.crypto || (typeof global != "undefined" ? global : void 0)?.crypto || (typeof window != "undefined" ? window : void 0)?.crypto || (typeof self != "undefined" ? self : void 0)?.crypto || (typeof frames != "undefined" ? frames : void 0)?.[0]?.crypto;
var randomWordArray;
if (crypto2) {
  randomWordArray = (nBytes) => {
    const words = [];
    for (let i3 = 0, rcache; i3 < nBytes; i3 += 4) {
      words.push(crypto2.getRandomValues(new Uint32Array(1))[0]);
    }
    return new WordArray(words, nBytes);
  };
} else {
  randomWordArray = (nBytes) => {
    const words = [];
    const r = (m_w) => {
      let _m_w = m_w;
      let _m_z = 987654321;
      const mask = 4294967295;
      return () => {
        _m_z = 36969 * (_m_z & 65535) + (_m_z >> 16) & mask;
        _m_w = 18e3 * (_m_w & 65535) + (_m_w >> 16) & mask;
        let result = (_m_z << 16) + _m_w & mask;
        result /= 4294967296;
        result += 0.5;
        return result * (Math.random() > 0.5 ? 1 : -1);
      };
    };
    for (let i3 = 0, rcache; i3 < nBytes; i3 += 4) {
      const _r = r((rcache || Math.random()) * 4294967296);
      rcache = _r() * 987654071;
      words.push(_r() * 4294967296 | 0);
    }
    return new WordArray(words, nBytes);
  };
}
var Base = class {
  /**
   * Extends this object and runs the init method.
   * Arguments to create() will be passed to init().
   *
   * @return {Object} The new object.
   *
   * @static
   *
   * @example
   *
   *     var instance = MyType.create();
   */
  static create(...args) {
    return new this(...args);
  }
  /**
   * Copies properties into this object.
   *
   * @param {Object} properties The properties to mix in.
   *
   * @example
   *
   *     MyType.mixIn({
   *         field: 'value'
   *     });
   */
  mixIn(properties) {
    return Object.assign(this, properties);
  }
  /**
   * Creates a copy of this object.
   *
   * @return {Object} The clone.
   *
   * @example
   *
   *     var clone = instance.clone();
   */
  clone() {
    const clone = new this.constructor();
    Object.assign(clone, this);
    return clone;
  }
};
var WordArray = class extends Base {
  /**
   * Initializes a newly created word array.
   *
   * @param {Array} words (Optional) An array of 32-bit words.
   * @param {number} sigBytes (Optional) The number of significant bytes in the words.
   *
   * @example
   *
   *     var wordArray = CryptoJS.lib.WordArray.create();
   *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
   *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
   */
  constructor(words = [], sigBytes = words.length * 4) {
    super();
    let typedArray = words;
    if (typedArray instanceof ArrayBuffer) {
      typedArray = new Uint8Array(typedArray);
    }
    if (typedArray instanceof Int8Array || typedArray instanceof Uint8ClampedArray || typedArray instanceof Int16Array || typedArray instanceof Uint16Array || typedArray instanceof Int32Array || typedArray instanceof Uint32Array || typedArray instanceof Float32Array || typedArray instanceof Float64Array) {
      typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    }
    if (typedArray instanceof Uint8Array) {
      const typedArrayByteLength = typedArray.byteLength;
      const _words = [];
      for (let i3 = 0; i3 < typedArrayByteLength; i3 += 1) {
        _words[i3 >>> 2] |= typedArray[i3] << 24 - i3 % 4 * 8;
      }
      this.words = _words;
      this.sigBytes = typedArrayByteLength;
    } else {
      this.words = words;
      this.sigBytes = sigBytes;
    }
  }
  /**
   * Converts this word array to a string.
   *
   * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
   *
   * @return {string} The stringified word array.
   *
   * @example
   *
   *     var string = wordArray + '';
   *     var string = wordArray.toString();
   *     var string = wordArray.toString(CryptoJS.enc.Utf8);
   */
  toString(encoder = Hex) {
    return encoder.stringify(this);
  }
  /**
   * Concatenates a word array to this word array.
   *
   * @param {WordArray} wordArray The word array to append.
   *
   * @return {WordArray} This word array.
   *
   * @example
   *
   *     wordArray1.concat(wordArray2);
   */
  concat(wordArray) {
    const thisWords = this.words;
    const thatWords = wordArray.words;
    const thisSigBytes = this.sigBytes;
    const thatSigBytes = wordArray.sigBytes;
    this.clamp();
    if (thisSigBytes % 4) {
      for (let i3 = 0; i3 < thatSigBytes; i3 += 1) {
        const thatByte = thatWords[i3 >>> 2] >>> 24 - i3 % 4 * 8 & 255;
        thisWords[thisSigBytes + i3 >>> 2] |= thatByte << 24 - (thisSigBytes + i3) % 4 * 8;
      }
    } else {
      for (let i3 = 0; i3 < thatSigBytes; i3 += 4) {
        thisWords[thisSigBytes + i3 >>> 2] = thatWords[i3 >>> 2];
      }
    }
    this.sigBytes += thatSigBytes;
    return this;
  }
  /**
   * Removes insignificant bits.
   *
   * @example
   *
   *     wordArray.clamp();
   */
  clamp() {
    const { words, sigBytes } = this;
    words[sigBytes >>> 2] &= 4294967295 << 32 - sigBytes % 4 * 8;
    words.length = Math.ceil(sigBytes / 4);
  }
  /**
   * Creates a copy of this word array.
   *
   * @return {WordArray} The clone.
   *
   * @example
   *
   *     var clone = wordArray.clone();
   */
  clone() {
    const clone = super.clone.call(this);
    clone.words = this.words.slice(0);
    return clone;
  }
};
/**
 * Creates a word array filled with random bytes.
 *
 * @param {number} nBytes The number of random bytes to generate.
 *
 * @return {WordArray} The random word array.
 *
 * @static
 *
 * @example
 *
 *     var wordArray = CryptoJS.lib.WordArray.random(16);
 */
__publicField(WordArray, "random", randomWordArray);
var Hex = {
  /**
   * Converts a word array to a hex string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The hex string.
   *
   * @static
   *
   * @example
   *
   *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
   */
  stringify(wordArray) {
    const { words, sigBytes } = wordArray;
    const hexChars = [];
    for (let i3 = 0; i3 < sigBytes; i3 += 1) {
      const bite = words[i3 >>> 2] >>> 24 - i3 % 4 * 8 & 255;
      hexChars.push((bite >>> 4).toString(16));
      hexChars.push((bite & 15).toString(16));
    }
    return hexChars.join("");
  },
  /**
   * Converts a hex string to a word array.
   *
   * @param {string} hexStr The hex string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
   */
  parse(hexStr) {
    const hexStrLength = hexStr.length;
    const words = [];
    for (let i3 = 0; i3 < hexStrLength; i3 += 2) {
      words[i3 >>> 3] |= parseInt(hexStr.substr(i3, 2), 16) << 24 - i3 % 8 * 4;
    }
    return new WordArray(words, hexStrLength / 2);
  }
};
var Latin1 = {
  /**
   * Converts a word array to a Latin1 string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The Latin1 string.
   *
   * @static
   *
   * @example
   *
   *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
   */
  stringify(wordArray) {
    const { words, sigBytes } = wordArray;
    const latin1Chars = [];
    for (let i3 = 0; i3 < sigBytes; i3 += 1) {
      const bite = words[i3 >>> 2] >>> 24 - i3 % 4 * 8 & 255;
      latin1Chars.push(String.fromCharCode(bite));
    }
    return latin1Chars.join("");
  },
  /**
   * Converts a Latin1 string to a word array.
   *
   * @param {string} latin1Str The Latin1 string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
   */
  parse(latin1Str) {
    const latin1StrLength = latin1Str.length;
    const words = [];
    for (let i3 = 0; i3 < latin1StrLength; i3 += 1) {
      words[i3 >>> 2] |= (latin1Str.charCodeAt(i3) & 255) << 24 - i3 % 4 * 8;
    }
    return new WordArray(words, latin1StrLength);
  }
};
var Utf8 = {
  /**
   * Converts a word array to a UTF-8 string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The UTF-8 string.
   *
   * @static
   *
   * @example
   *
   *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
   */
  stringify(wordArray) {
    try {
      return decodeURIComponent(escape(Latin1.stringify(wordArray)));
    } catch (e) {
      throw new Error("Malformed UTF-8 data");
    }
  },
  /**
   * Converts a UTF-8 string to a word array.
   *
   * @param {string} utf8Str The UTF-8 string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
   */
  parse(utf8Str) {
    return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
  }
};
var BufferedBlockAlgorithm = class extends Base {
  constructor() {
    super();
    this._minBufferSize = 0;
  }
  /**
   * Resets this block algorithm's data buffer to its initial state.
   *
   * @example
   *
   *     bufferedBlockAlgorithm.reset();
   */
  reset() {
    this._data = new WordArray();
    this._nDataBytes = 0;
  }
  /**
   * Adds new data to this block algorithm's buffer.
   *
   * @param {WordArray|string} data
   *
   *     The data to append. Strings are converted to a WordArray using UTF-8.
   *
   * @example
   *
   *     bufferedBlockAlgorithm._append('data');
   *     bufferedBlockAlgorithm._append(wordArray);
   */
  _append(data) {
    let m_data = data;
    if (typeof m_data === "string") {
      m_data = Utf8.parse(m_data);
    }
    this._data.concat(m_data);
    this._nDataBytes += m_data.sigBytes;
  }
  /**
   * Processes available data blocks.
   *
   * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
   *
   * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
   *
   * @return {WordArray} The processed data.
   *
   * @example
   *
   *     var processedData = bufferedBlockAlgorithm._process();
   *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
   */
  _process(doFlush) {
    let processedWords;
    const { _data: data, blockSize } = this;
    const dataWords = data.words;
    const dataSigBytes = data.sigBytes;
    const blockSizeBytes = blockSize * 4;
    let nBlocksReady = dataSigBytes / blockSizeBytes;
    if (doFlush) {
      nBlocksReady = Math.ceil(nBlocksReady);
    } else {
      nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
    }
    const nWordsReady = nBlocksReady * blockSize;
    const nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);
    if (nWordsReady) {
      for (let offset = 0; offset < nWordsReady; offset += blockSize) {
        this._doProcessBlock(dataWords, offset);
      }
      processedWords = dataWords.splice(0, nWordsReady);
      data.sigBytes -= nBytesReady;
    }
    return new WordArray(processedWords, nBytesReady);
  }
  /**
   * Creates a copy of this object.
   *
   * @return {Object} The clone.
   *
   * @example
   *
   *     var clone = bufferedBlockAlgorithm.clone();
   */
  clone() {
    const clone = super.clone.call(this);
    clone._data = this._data.clone();
    return clone;
  }
};
var Hasher = class extends BufferedBlockAlgorithm {
  constructor(cfg) {
    super();
    this.blockSize = 512 / 32;
    this.cfg = Object.assign(new Base(), cfg);
    this.reset();
  }
  /**
   * Creates a shortcut function to a hasher's object interface.
   *
   * @param {Hasher} SubHasher The hasher to create a helper for.
   *
   * @return {Function} The shortcut function.
   *
   * @static
   *
   * @example
   *
   *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
   */
  static _createHelper(SubHasher) {
    return (message, cfg) => new SubHasher(cfg).finalize(message);
  }
  /**
   * Creates a shortcut function to the HMAC's object interface.
   *
   * @param {Hasher} SubHasher The hasher to use in this HMAC helper.
   *
   * @return {Function} The shortcut function.
   *
   * @static
   *
   * @example
   *
   *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
   */
  static _createHmacHelper(SubHasher) {
    return (message, key2) => new HMAC(SubHasher, key2).finalize(message);
  }
  /**
   * Resets this hasher to its initial state.
   *
   * @example
   *
   *     hasher.reset();
   */
  reset() {
    super.reset.call(this);
    this._doReset();
  }
  /**
   * Updates this hasher with a message.
   *
   * @param {WordArray|string} messageUpdate The message to append.
   *
   * @return {Hasher} This hasher.
   *
   * @example
   *
   *     hasher.update('message');
   *     hasher.update(wordArray);
   */
  update(messageUpdate) {
    this._append(messageUpdate);
    this._process();
    return this;
  }
  /**
   * Finalizes the hash computation.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   *
   * @param {WordArray|string} messageUpdate (Optional) A final message update.
   *
   * @return {WordArray} The hash.
   *
   * @example
   *
   *     var hash = hasher.finalize();
   *     var hash = hasher.finalize('message');
   *     var hash = hasher.finalize(wordArray);
   */
  finalize(messageUpdate) {
    if (messageUpdate) {
      this._append(messageUpdate);
    }
    const hash = this._doFinalize();
    return hash;
  }
};
var HMAC = class extends Base {
  /**
   * Initializes a newly created HMAC.
   *
   * @param {Hasher} SubHasher The hash algorithm to use.
   * @param {WordArray|string} key The secret key.
   *
   * @example
   *
   *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
   */
  constructor(SubHasher, key2) {
    super();
    const hasher = new SubHasher();
    this._hasher = hasher;
    let _key = key2;
    if (typeof _key === "string") {
      _key = Utf8.parse(_key);
    }
    const hasherBlockSize = hasher.blockSize;
    const hasherBlockSizeBytes = hasherBlockSize * 4;
    if (_key.sigBytes > hasherBlockSizeBytes) {
      _key = hasher.finalize(key2);
    }
    _key.clamp();
    const oKey = _key.clone();
    this._oKey = oKey;
    const iKey = _key.clone();
    this._iKey = iKey;
    const oKeyWords = oKey.words;
    const iKeyWords = iKey.words;
    for (let i3 = 0; i3 < hasherBlockSize; i3 += 1) {
      oKeyWords[i3] ^= 1549556828;
      iKeyWords[i3] ^= 909522486;
    }
    oKey.sigBytes = hasherBlockSizeBytes;
    iKey.sigBytes = hasherBlockSizeBytes;
    this.reset();
  }
  /**
   * Resets this HMAC to its initial state.
   *
   * @example
   *
   *     hmacHasher.reset();
   */
  reset() {
    const hasher = this._hasher;
    hasher.reset();
    hasher.update(this._iKey);
  }
  /**
   * Updates this HMAC with a message.
   *
   * @param {WordArray|string} messageUpdate The message to append.
   *
   * @return {HMAC} This HMAC instance.
   *
   * @example
   *
   *     hmacHasher.update('message');
   *     hmacHasher.update(wordArray);
   */
  update(messageUpdate) {
    this._hasher.update(messageUpdate);
    return this;
  }
  /**
   * Finalizes the HMAC computation.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   *
   * @param {WordArray|string} messageUpdate (Optional) A final message update.
   *
   * @return {WordArray} The HMAC.
   *
   * @example
   *
   *     var hmac = hmacHasher.finalize();
   *     var hmac = hmacHasher.finalize('message');
   *     var hmac = hmacHasher.finalize(wordArray);
   */
  finalize(messageUpdate) {
    const hasher = this._hasher;
    const innerHash = hasher.finalize(messageUpdate);
    hasher.reset();
    const hmac = hasher.finalize(this._oKey.clone().concat(innerHash));
    return hmac;
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/x64-core.js
var X32WordArray = WordArray;
var X64Word = class extends Base {
  /**
   * Initializes a newly created 64-bit word.
   *
   * @param {number} high The high 32 bits.
   * @param {number} low The low 32 bits.
   *
   * @example
   *
   *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
   */
  constructor(high, low) {
    super();
    this.high = high;
    this.low = low;
  }
};
var X64WordArray = class extends Base {
  /**
   * Initializes a newly created word array.
   *
   * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
   * @param {number} sigBytes (Optional) The number of significant bytes in the words.
   *
   * @example
   *
   *     var wordArray = CryptoJS.x64.WordArray.create();
   *
   *     var wordArray = CryptoJS.x64.WordArray.create([
   *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
   *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
   *     ]);
   *
   *     var wordArray = CryptoJS.x64.WordArray.create([
   *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
   *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
   *     ], 10);
   */
  constructor(words = [], sigBytes = words.length * 8) {
    super();
    this.words = words;
    this.sigBytes = sigBytes;
  }
  /**
   * Converts this 64-bit word array to a 32-bit word array.
   *
   * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
   *
   * @example
   *
   *     var x32WordArray = x64WordArray.toX32();
   */
  toX32() {
    const x64Words = this.words;
    const x64WordsLength = x64Words.length;
    const x32Words = [];
    for (let i3 = 0; i3 < x64WordsLength; i3 += 1) {
      const x64Word = x64Words[i3];
      x32Words.push(x64Word.high);
      x32Words.push(x64Word.low);
    }
    return X32WordArray.create(x32Words, this.sigBytes);
  }
  /**
   * Creates a copy of this word array.
   *
   * @return {X64WordArray} The clone.
   *
   * @example
   *
   *     var clone = x64WordArray.clone();
   */
  clone() {
    const clone = super.clone.call(this);
    clone.words = this.words.slice(0);
    const { words } = clone;
    const wordsLength = words.length;
    for (let i3 = 0; i3 < wordsLength; i3 += 1) {
      words[i3] = words[i3].clone();
    }
    return clone;
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/enc-base64.js
var parseLoop = (base64Str, base64StrLength, reverseMap) => {
  const words = [];
  let nBytes = 0;
  for (let i3 = 0; i3 < base64StrLength; i3 += 1) {
    if (i3 % 4) {
      const bits1 = reverseMap[base64Str.charCodeAt(i3 - 1)] << i3 % 4 * 2;
      const bits2 = reverseMap[base64Str.charCodeAt(i3)] >>> 6 - i3 % 4 * 2;
      const bitsCombined = bits1 | bits2;
      words[nBytes >>> 2] |= bitsCombined << 24 - nBytes % 4 * 8;
      nBytes += 1;
    }
  }
  return WordArray.create(words, nBytes);
};
var Base64 = {
  /**
   * Converts a word array to a Base64 string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The Base64 string.
   *
   * @static
   *
   * @example
   *
   *     const base64String = CryptoJS.enc.Base64.stringify(wordArray);
   */
  stringify(wordArray) {
    const { words, sigBytes } = wordArray;
    const map = this._map;
    wordArray.clamp();
    const base64Chars = [];
    for (let i3 = 0; i3 < sigBytes; i3 += 3) {
      const byte1 = words[i3 >>> 2] >>> 24 - i3 % 4 * 8 & 255;
      const byte2 = words[i3 + 1 >>> 2] >>> 24 - (i3 + 1) % 4 * 8 & 255;
      const byte3 = words[i3 + 2 >>> 2] >>> 24 - (i3 + 2) % 4 * 8 & 255;
      const triplet = byte1 << 16 | byte2 << 8 | byte3;
      for (let j = 0; j < 4 && i3 + j * 0.75 < sigBytes; j += 1) {
        base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
      }
    }
    const paddingChar = map.charAt(64);
    if (paddingChar) {
      while (base64Chars.length % 4) {
        base64Chars.push(paddingChar);
      }
    }
    return base64Chars.join("");
  },
  /**
   * Converts a Base64 string to a word array.
   *
   * @param {string} base64Str The Base64 string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     const wordArray = CryptoJS.enc.Base64.parse(base64String);
   */
  parse(base64Str) {
    let base64StrLength = base64Str.length;
    const map = this._map;
    let reverseMap = this._reverseMap;
    if (!reverseMap) {
      this._reverseMap = [];
      reverseMap = this._reverseMap;
      for (let j = 0; j < map.length; j += 1) {
        reverseMap[map.charCodeAt(j)] = j;
      }
    }
    const paddingChar = map.charAt(64);
    if (paddingChar) {
      const paddingIndex = base64Str.indexOf(paddingChar);
      if (paddingIndex !== -1) {
        base64StrLength = paddingIndex;
      }
    }
    return parseLoop(base64Str, base64StrLength, reverseMap);
  },
  _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/md5.js
var T = [];
for (let i3 = 0; i3 < 64; i3 += 1) {
  T[i3] = Math.abs(Math.sin(i3 + 1)) * 4294967296 | 0;
}
var FF = (a, b, c, d2, x2, s, t) => {
  const n2 = a + (b & c | ~b & d2) + x2 + t;
  return (n2 << s | n2 >>> 32 - s) + b;
};
var GG = (a, b, c, d2, x2, s, t) => {
  const n2 = a + (b & d2 | c & ~d2) + x2 + t;
  return (n2 << s | n2 >>> 32 - s) + b;
};
var HH = (a, b, c, d2, x2, s, t) => {
  const n2 = a + (b ^ c ^ d2) + x2 + t;
  return (n2 << s | n2 >>> 32 - s) + b;
};
var II = (a, b, c, d2, x2, s, t) => {
  const n2 = a + (c ^ (b | ~d2)) + x2 + t;
  return (n2 << s | n2 >>> 32 - s) + b;
};
var MD5Algo = class extends Hasher {
  _doReset() {
    this._hash = new WordArray([
      1732584193,
      4023233417,
      2562383102,
      271733878
    ]);
  }
  _doProcessBlock(M, offset) {
    const _M = M;
    for (let i3 = 0; i3 < 16; i3 += 1) {
      const offset_i = offset + i3;
      const M_offset_i = M[offset_i];
      _M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 16711935 | (M_offset_i << 24 | M_offset_i >>> 8) & 4278255360;
    }
    const H2 = this._hash.words;
    const M_offset_0 = _M[offset + 0];
    const M_offset_1 = _M[offset + 1];
    const M_offset_2 = _M[offset + 2];
    const M_offset_3 = _M[offset + 3];
    const M_offset_4 = _M[offset + 4];
    const M_offset_5 = _M[offset + 5];
    const M_offset_6 = _M[offset + 6];
    const M_offset_7 = _M[offset + 7];
    const M_offset_8 = _M[offset + 8];
    const M_offset_9 = _M[offset + 9];
    const M_offset_10 = _M[offset + 10];
    const M_offset_11 = _M[offset + 11];
    const M_offset_12 = _M[offset + 12];
    const M_offset_13 = _M[offset + 13];
    const M_offset_14 = _M[offset + 14];
    const M_offset_15 = _M[offset + 15];
    let a = H2[0];
    let b = H2[1];
    let c = H2[2];
    let d2 = H2[3];
    a = FF(a, b, c, d2, M_offset_0, 7, T[0]);
    d2 = FF(d2, a, b, c, M_offset_1, 12, T[1]);
    c = FF(c, d2, a, b, M_offset_2, 17, T[2]);
    b = FF(b, c, d2, a, M_offset_3, 22, T[3]);
    a = FF(a, b, c, d2, M_offset_4, 7, T[4]);
    d2 = FF(d2, a, b, c, M_offset_5, 12, T[5]);
    c = FF(c, d2, a, b, M_offset_6, 17, T[6]);
    b = FF(b, c, d2, a, M_offset_7, 22, T[7]);
    a = FF(a, b, c, d2, M_offset_8, 7, T[8]);
    d2 = FF(d2, a, b, c, M_offset_9, 12, T[9]);
    c = FF(c, d2, a, b, M_offset_10, 17, T[10]);
    b = FF(b, c, d2, a, M_offset_11, 22, T[11]);
    a = FF(a, b, c, d2, M_offset_12, 7, T[12]);
    d2 = FF(d2, a, b, c, M_offset_13, 12, T[13]);
    c = FF(c, d2, a, b, M_offset_14, 17, T[14]);
    b = FF(b, c, d2, a, M_offset_15, 22, T[15]);
    a = GG(a, b, c, d2, M_offset_1, 5, T[16]);
    d2 = GG(d2, a, b, c, M_offset_6, 9, T[17]);
    c = GG(c, d2, a, b, M_offset_11, 14, T[18]);
    b = GG(b, c, d2, a, M_offset_0, 20, T[19]);
    a = GG(a, b, c, d2, M_offset_5, 5, T[20]);
    d2 = GG(d2, a, b, c, M_offset_10, 9, T[21]);
    c = GG(c, d2, a, b, M_offset_15, 14, T[22]);
    b = GG(b, c, d2, a, M_offset_4, 20, T[23]);
    a = GG(a, b, c, d2, M_offset_9, 5, T[24]);
    d2 = GG(d2, a, b, c, M_offset_14, 9, T[25]);
    c = GG(c, d2, a, b, M_offset_3, 14, T[26]);
    b = GG(b, c, d2, a, M_offset_8, 20, T[27]);
    a = GG(a, b, c, d2, M_offset_13, 5, T[28]);
    d2 = GG(d2, a, b, c, M_offset_2, 9, T[29]);
    c = GG(c, d2, a, b, M_offset_7, 14, T[30]);
    b = GG(b, c, d2, a, M_offset_12, 20, T[31]);
    a = HH(a, b, c, d2, M_offset_5, 4, T[32]);
    d2 = HH(d2, a, b, c, M_offset_8, 11, T[33]);
    c = HH(c, d2, a, b, M_offset_11, 16, T[34]);
    b = HH(b, c, d2, a, M_offset_14, 23, T[35]);
    a = HH(a, b, c, d2, M_offset_1, 4, T[36]);
    d2 = HH(d2, a, b, c, M_offset_4, 11, T[37]);
    c = HH(c, d2, a, b, M_offset_7, 16, T[38]);
    b = HH(b, c, d2, a, M_offset_10, 23, T[39]);
    a = HH(a, b, c, d2, M_offset_13, 4, T[40]);
    d2 = HH(d2, a, b, c, M_offset_0, 11, T[41]);
    c = HH(c, d2, a, b, M_offset_3, 16, T[42]);
    b = HH(b, c, d2, a, M_offset_6, 23, T[43]);
    a = HH(a, b, c, d2, M_offset_9, 4, T[44]);
    d2 = HH(d2, a, b, c, M_offset_12, 11, T[45]);
    c = HH(c, d2, a, b, M_offset_15, 16, T[46]);
    b = HH(b, c, d2, a, M_offset_2, 23, T[47]);
    a = II(a, b, c, d2, M_offset_0, 6, T[48]);
    d2 = II(d2, a, b, c, M_offset_7, 10, T[49]);
    c = II(c, d2, a, b, M_offset_14, 15, T[50]);
    b = II(b, c, d2, a, M_offset_5, 21, T[51]);
    a = II(a, b, c, d2, M_offset_12, 6, T[52]);
    d2 = II(d2, a, b, c, M_offset_3, 10, T[53]);
    c = II(c, d2, a, b, M_offset_10, 15, T[54]);
    b = II(b, c, d2, a, M_offset_1, 21, T[55]);
    a = II(a, b, c, d2, M_offset_8, 6, T[56]);
    d2 = II(d2, a, b, c, M_offset_15, 10, T[57]);
    c = II(c, d2, a, b, M_offset_6, 15, T[58]);
    b = II(b, c, d2, a, M_offset_13, 21, T[59]);
    a = II(a, b, c, d2, M_offset_4, 6, T[60]);
    d2 = II(d2, a, b, c, M_offset_11, 10, T[61]);
    c = II(c, d2, a, b, M_offset_2, 15, T[62]);
    b = II(b, c, d2, a, M_offset_9, 21, T[63]);
    H2[0] = H2[0] + a | 0;
    H2[1] = H2[1] + b | 0;
    H2[2] = H2[2] + c | 0;
    H2[3] = H2[3] + d2 | 0;
  }
  /* eslint-ensable no-param-reassign */
  _doFinalize() {
    const data = this._data;
    const dataWords = data.words;
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = data.sigBytes * 8;
    dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    const nBitsTotalH = Math.floor(nBitsTotal / 4294967296);
    const nBitsTotalL = nBitsTotal;
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = (nBitsTotalH << 8 | nBitsTotalH >>> 24) & 16711935 | (nBitsTotalH << 24 | nBitsTotalH >>> 8) & 4278255360;
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotalL << 8 | nBitsTotalL >>> 24) & 16711935 | (nBitsTotalL << 24 | nBitsTotalL >>> 8) & 4278255360;
    data.sigBytes = (dataWords.length + 1) * 4;
    this._process();
    const hash = this._hash;
    const H2 = hash.words;
    for (let i3 = 0; i3 < 4; i3 += 1) {
      const H_i = H2[i3];
      H2[i3] = (H_i << 8 | H_i >>> 24) & 16711935 | (H_i << 24 | H_i >>> 8) & 4278255360;
    }
    return hash;
  }
  clone() {
    const clone = super.clone.call(this);
    clone._hash = this._hash.clone();
    return clone;
  }
};
var MD5 = Hasher._createHelper(MD5Algo);
var HmacMD5 = Hasher._createHmacHelper(MD5Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/evpkdf.js
var EvpKDFAlgo = class extends Base {
  /**
   * Initializes a newly created key derivation function.
   *
   * @param {Object} cfg (Optional) The configuration options to use for the derivation.
   *
   * @example
   *
   *     const kdf = CryptoJS.algo.EvpKDF.create();
   *     const kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8 });
   *     const kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8, iterations: 1000 });
   */
  constructor(cfg) {
    super();
    this.cfg = Object.assign(
      new Base(),
      {
        keySize: 128 / 32,
        hasher: MD5Algo,
        iterations: 1
      },
      cfg
    );
  }
  /**
   * Derives a key from a password.
   *
   * @param {WordArray|string} password The password.
   * @param {WordArray|string} salt A salt.
   *
   * @return {WordArray} The derived key.
   *
   * @example
   *
   *     const key = kdf.compute(password, salt);
   */
  compute(password, salt) {
    let block;
    const { cfg } = this;
    const hasher = cfg.hasher.create();
    const derivedKey = WordArray.create();
    const derivedKeyWords = derivedKey.words;
    const { keySize, iterations } = cfg;
    while (derivedKeyWords.length < keySize) {
      if (block) {
        hasher.update(block);
      }
      block = hasher.update(password).finalize(salt);
      hasher.reset();
      for (let i3 = 1; i3 < iterations; i3 += 1) {
        block = hasher.finalize(block);
        hasher.reset();
      }
      derivedKey.concat(block);
    }
    derivedKey.sigBytes = keySize * 4;
    return derivedKey;
  }
};
var EvpKDF = (password, salt, cfg) => EvpKDFAlgo.create(cfg).compute(password, salt);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/cipher-core.js
var Cipher = class extends BufferedBlockAlgorithm {
  /**
   * Initializes a newly created cipher.
   *
   * @param {number} xformMode Either the encryption or decryption transormation mode constant.
   * @param {WordArray} key The key.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @example
   *
   *     const cipher = CryptoJS.algo.AES.create(
   *       CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray }
   *     );
   */
  constructor(xformMode, key2, cfg) {
    super();
    this.cfg = Object.assign(new Base(), cfg);
    this._xformMode = xformMode;
    this._key = key2;
    this.reset();
  }
  /**
   * Creates this cipher in encryption mode.
   *
   * @param {WordArray} key The key.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @return {Cipher} A cipher instance.
   *
   * @static
   *
   * @example
   *
   *     const cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
   */
  static createEncryptor(key2, cfg) {
    return this.create(this._ENC_XFORM_MODE, key2, cfg);
  }
  /**
   * Creates this cipher in decryption mode.
   *
   * @param {WordArray} key The key.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @return {Cipher} A cipher instance.
   *
   * @static
   *
   * @example
   *
   *     const cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
   */
  static createDecryptor(key2, cfg) {
    return this.create(this._DEC_XFORM_MODE, key2, cfg);
  }
  /**
   * Creates shortcut functions to a cipher's object interface.
   *
   * @param {Cipher} cipher The cipher to create a helper for.
   *
   * @return {Object} An object with encrypt and decrypt shortcut functions.
   *
   * @static
   *
   * @example
   *
   *     const AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
   */
  static _createHelper(SubCipher) {
    const selectCipherStrategy = (key2) => {
      if (typeof key2 === "string") {
        return PasswordBasedCipher;
      }
      return SerializableCipher;
    };
    return {
      encrypt(message, key2, cfg) {
        return selectCipherStrategy(key2).encrypt(SubCipher, message, key2, cfg);
      },
      decrypt(ciphertext, key2, cfg) {
        return selectCipherStrategy(key2).decrypt(SubCipher, ciphertext, key2, cfg);
      }
    };
  }
  /**
   * Resets this cipher to its initial state.
   *
   * @example
   *
   *     cipher.reset();
   */
  reset() {
    super.reset.call(this);
    this._doReset();
  }
  /**
   * Adds data to be encrypted or decrypted.
   *
   * @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
   *
   * @return {WordArray} The data after processing.
   *
   * @example
   *
   *     const encrypted = cipher.process('data');
   *     const encrypted = cipher.process(wordArray);
   */
  process(dataUpdate) {
    this._append(dataUpdate);
    return this._process();
  }
  /**
   * Finalizes the encryption or decryption process.
   * Note that the finalize operation is effectively a destructive, read-once operation.
   *
   * @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
   *
   * @return {WordArray} The data after final processing.
   *
   * @example
   *
   *     const encrypted = cipher.finalize();
   *     const encrypted = cipher.finalize('data');
   *     const encrypted = cipher.finalize(wordArray);
   */
  finalize(dataUpdate) {
    if (dataUpdate) {
      this._append(dataUpdate);
    }
    const finalProcessedData = this._doFinalize();
    return finalProcessedData;
  }
};
Cipher._ENC_XFORM_MODE = 1;
Cipher._DEC_XFORM_MODE = 2;
Cipher.keySize = 128 / 32;
Cipher.ivSize = 128 / 32;
var StreamCipher = class extends Cipher {
  constructor(...args) {
    super(...args);
    this.blockSize = 1;
  }
  _doFinalize() {
    const finalProcessedBlocks = this._process(true);
    return finalProcessedBlocks;
  }
};
var BlockCipherMode = class extends Base {
  /**
   * Initializes a newly created mode.
   *
   * @param {Cipher} cipher A block cipher instance.
   * @param {Array} iv The IV words.
   *
   * @example
   *
   *     const mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
   */
  constructor(cipher, iv) {
    super();
    this._cipher = cipher;
    this._iv = iv;
  }
  /**
   * Creates this mode for encryption.
   *
   * @param {Cipher} cipher A block cipher instance.
   * @param {Array} iv The IV words.
   *
   * @static
   *
   * @example
   *
   *     const mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
   */
  static createEncryptor(cipher, iv) {
    return this.Encryptor.create(cipher, iv);
  }
  /**
   * Creates this mode for decryption.
   *
   * @param {Cipher} cipher A block cipher instance.
   * @param {Array} iv The IV words.
   *
   * @static
   *
   * @example
   *
   *     const mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
   */
  static createDecryptor(cipher, iv) {
    return this.Decryptor.create(cipher, iv);
  }
};
function xorBlock(words, offset, blockSize) {
  const _words = words;
  let block;
  const iv = this._iv;
  if (iv) {
    block = iv;
    this._iv = void 0;
  } else {
    block = this._prevBlock;
  }
  for (let i3 = 0; i3 < blockSize; i3 += 1) {
    _words[offset + i3] ^= block[i3];
  }
}
var CBC = class extends BlockCipherMode {
};
CBC.Encryptor = class extends CBC {
  /**
   * Processes the data block at offset.
   *
   * @param {Array} words The data words to operate on.
   * @param {number} offset The offset where the block starts.
   *
   * @example
   *
   *     mode.processBlock(data.words, offset);
   */
  processBlock(words, offset) {
    const cipher = this._cipher;
    const { blockSize } = cipher;
    xorBlock.call(this, words, offset, blockSize);
    cipher.encryptBlock(words, offset);
    this._prevBlock = words.slice(offset, offset + blockSize);
  }
};
CBC.Decryptor = class extends CBC {
  /**
   * Processes the data block at offset.
   *
   * @param {Array} words The data words to operate on.
   * @param {number} offset The offset where the block starts.
   *
   * @example
   *
   *     mode.processBlock(data.words, offset);
   */
  processBlock(words, offset) {
    const cipher = this._cipher;
    const { blockSize } = cipher;
    const thisBlock = words.slice(offset, offset + blockSize);
    cipher.decryptBlock(words, offset);
    xorBlock.call(this, words, offset, blockSize);
    this._prevBlock = thisBlock;
  }
};
var Pkcs7 = {
  /**
   * Pads data using the algorithm defined in PKCS #5/7.
   *
   * @param {WordArray} data The data to pad.
   * @param {number} blockSize The multiple that the data should be padded to.
   *
   * @static
   *
   * @example
   *
   *     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
   */
  pad(data, blockSize) {
    const blockSizeBytes = blockSize * 4;
    const nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
    const paddingWord = nPaddingBytes << 24 | nPaddingBytes << 16 | nPaddingBytes << 8 | nPaddingBytes;
    const paddingWords = [];
    for (let i3 = 0; i3 < nPaddingBytes; i3 += 4) {
      paddingWords.push(paddingWord);
    }
    const padding = WordArray.create(paddingWords, nPaddingBytes);
    data.concat(padding);
  },
  /**
   * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
   *
   * @param {WordArray} data The data to unpad.
   *
   * @static
   *
   * @example
   *
   *     CryptoJS.pad.Pkcs7.unpad(wordArray);
   */
  unpad(data) {
    const _data = data;
    const nPaddingBytes = _data.words[_data.sigBytes - 1 >>> 2] & 255;
    _data.sigBytes -= nPaddingBytes;
  }
};
var BlockCipher = class extends Cipher {
  constructor(xformMode, key2, cfg) {
    super(xformMode, key2, Object.assign(
      {
        mode: CBC,
        padding: Pkcs7
      },
      cfg
    ));
    this.blockSize = 128 / 32;
  }
  reset() {
    let modeCreator;
    super.reset.call(this);
    const { cfg } = this;
    const { iv, mode } = cfg;
    if (this._xformMode === this.constructor._ENC_XFORM_MODE) {
      modeCreator = mode.createEncryptor;
    } else {
      modeCreator = mode.createDecryptor;
      this._minBufferSize = 1;
    }
    this._mode = modeCreator.call(mode, this, iv && iv.words);
    this._mode.__creator = modeCreator;
  }
  _doProcessBlock(words, offset) {
    this._mode.processBlock(words, offset);
  }
  _doFinalize() {
    let finalProcessedBlocks;
    const { padding } = this.cfg;
    if (this._xformMode === this.constructor._ENC_XFORM_MODE) {
      padding.pad(this._data, this.blockSize);
      finalProcessedBlocks = this._process(true);
    } else {
      finalProcessedBlocks = this._process(true);
      padding.unpad(finalProcessedBlocks);
    }
    return finalProcessedBlocks;
  }
};
var CipherParams = class extends Base {
  /**
   * Initializes a newly created cipher params object.
   *
   * @param {Object} cipherParams An object with any of the possible cipher parameters.
   *
   * @example
   *
   *     var cipherParams = CryptoJS.lib.CipherParams.create({
   *         ciphertext: ciphertextWordArray,
   *         key: keyWordArray,
   *         iv: ivWordArray,
   *         salt: saltWordArray,
   *         algorithm: CryptoJS.algo.AES,
   *         mode: CryptoJS.mode.CBC,
   *         padding: CryptoJS.pad.PKCS7,
   *         blockSize: 4,
   *         formatter: CryptoJS.format.OpenSSL
   *     });
   */
  constructor(cipherParams) {
    super();
    this.mixIn(cipherParams);
  }
  /**
   * Converts this cipher params object to a string.
   *
   * @param {Format} formatter (Optional) The formatting strategy to use.
   *
   * @return {string} The stringified cipher params.
   *
   * @throws Error If neither the formatter nor the default formatter is set.
   *
   * @example
   *
   *     var string = cipherParams + '';
   *     var string = cipherParams.toString();
   *     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
   */
  toString(formatter) {
    return (formatter || this.formatter).stringify(this);
  }
};
var OpenSSLFormatter = {
  /**
   * Converts a cipher params object to an OpenSSL-compatible string.
   *
   * @param {CipherParams} cipherParams The cipher params object.
   *
   * @return {string} The OpenSSL-compatible string.
   *
   * @static
   *
   * @example
   *
   *     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
   */
  stringify(cipherParams) {
    let wordArray;
    const { ciphertext, salt } = cipherParams;
    if (salt) {
      wordArray = WordArray.create([1398893684, 1701076831]).concat(salt).concat(ciphertext);
    } else {
      wordArray = ciphertext;
    }
    return wordArray.toString(Base64);
  },
  /**
   * Converts an OpenSSL-compatible string to a cipher params object.
   *
   * @param {string} openSSLStr The OpenSSL-compatible string.
   *
   * @return {CipherParams} The cipher params object.
   *
   * @static
   *
   * @example
   *
   *     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
   */
  parse(openSSLStr) {
    let salt;
    const ciphertext = Base64.parse(openSSLStr);
    const ciphertextWords = ciphertext.words;
    if (ciphertextWords[0] === 1398893684 && ciphertextWords[1] === 1701076831) {
      salt = WordArray.create(ciphertextWords.slice(2, 4));
      ciphertextWords.splice(0, 4);
      ciphertext.sigBytes -= 16;
    }
    return CipherParams.create({ ciphertext, salt });
  }
};
var SerializableCipher = class extends Base {
  /**
   * Encrypts a message.
   *
   * @param {Cipher} cipher The cipher algorithm to use.
   * @param {WordArray|string} message The message to encrypt.
   * @param {WordArray} key The key.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @return {CipherParams} A cipher params object.
   *
   * @static
   *
   * @example
   *
   *     var ciphertextParams = CryptoJS.lib.SerializableCipher
   *       .encrypt(CryptoJS.algo.AES, message, key);
   *     var ciphertextParams = CryptoJS.lib.SerializableCipher
   *       .encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
   *     var ciphertextParams = CryptoJS.lib.SerializableCipher
   *       .encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
   */
  static encrypt(cipher, message, key2, cfg) {
    const _cfg = Object.assign(new Base(), this.cfg, cfg);
    const encryptor = cipher.createEncryptor(key2, _cfg);
    const ciphertext = encryptor.finalize(message);
    const cipherCfg = encryptor.cfg;
    return CipherParams.create({
      ciphertext,
      key: key2,
      iv: cipherCfg.iv,
      algorithm: cipher,
      mode: cipherCfg.mode,
      padding: cipherCfg.padding,
      blockSize: encryptor.blockSize,
      formatter: _cfg.format
    });
  }
  /**
   * Decrypts serialized ciphertext.
   *
   * @param {Cipher} cipher The cipher algorithm to use.
   * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
   * @param {WordArray} key The key.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @return {WordArray} The plaintext.
   *
   * @static
   *
   * @example
   *
   *     var plaintext = CryptoJS.lib.SerializableCipher
   *       .decrypt(CryptoJS.algo.AES, formattedCiphertext, key,
   *         { iv: iv, format: CryptoJS.format.OpenSSL });
   *     var plaintext = CryptoJS.lib.SerializableCipher
   *       .decrypt(CryptoJS.algo.AES, ciphertextParams, key,
   *         { iv: iv, format: CryptoJS.format.OpenSSL });
   */
  static decrypt(cipher, ciphertext, key2, cfg) {
    let _ciphertext = ciphertext;
    const _cfg = Object.assign(new Base(), this.cfg, cfg);
    _ciphertext = this._parse(_ciphertext, _cfg.format);
    const plaintext = cipher.createDecryptor(key2, _cfg).finalize(_ciphertext.ciphertext);
    return plaintext;
  }
  /**
   * Converts serialized ciphertext to CipherParams,
   * else assumed CipherParams already and returns ciphertext unchanged.
   *
   * @param {CipherParams|string} ciphertext The ciphertext.
   * @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
   *
   * @return {CipherParams} The unserialized ciphertext.
   *
   * @static
   *
   * @example
   *
   *     var ciphertextParams = CryptoJS.lib.SerializableCipher
   *       ._parse(ciphertextStringOrParams, format);
   */
  static _parse(ciphertext, format) {
    if (typeof ciphertext === "string") {
      return format.parse(ciphertext, this);
    }
    return ciphertext;
  }
};
SerializableCipher.cfg = Object.assign(
  new Base(),
  { format: OpenSSLFormatter }
);
var OpenSSLKdf = {
  /**
   * Derives a key and IV from a password.
   *
   * @param {string} password The password to derive from.
   * @param {number} keySize The size in words of the key to generate.
   * @param {number} ivSize The size in words of the IV to generate.
   * @param {WordArray|string} salt
   *     (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
   *
   * @return {CipherParams} A cipher params object with the key, IV, and salt.
   *
   * @static
   *
   * @example
   *
   *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
   *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
   */
  execute(password, keySize, ivSize, salt, hasher) {
    let _salt = salt;
    if (!_salt) {
      _salt = WordArray.random(64 / 8);
    }
    let key2;
    if (!hasher) {
      key2 = EvpKDFAlgo.create({ keySize: keySize + ivSize }).compute(password, _salt);
    } else {
      key2 = EvpKDFAlgo.create({ keySize: keySize + ivSize, hasher }).compute(password, _salt);
    }
    const iv = WordArray.create(key2.words.slice(keySize), ivSize * 4);
    key2.sigBytes = keySize * 4;
    return CipherParams.create({ key: key2, iv, salt: _salt });
  }
};
var PasswordBasedCipher = class extends SerializableCipher {
  /**
   * Encrypts a message using a password.
   *
   * @param {Cipher} cipher The cipher algorithm to use.
   * @param {WordArray|string} message The message to encrypt.
   * @param {string} password The password.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @return {CipherParams} A cipher params object.
   *
   * @static
   *
   * @example
   *
   *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher
   *       .encrypt(CryptoJS.algo.AES, message, 'password');
   *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher
   *       .encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
   */
  static encrypt(cipher, message, password, cfg) {
    const _cfg = Object.assign(new Base(), this.cfg, cfg);
    const derivedParams = _cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, _cfg.salt, _cfg.hasher);
    _cfg.iv = derivedParams.iv;
    const ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, _cfg);
    ciphertext.mixIn(derivedParams);
    return ciphertext;
  }
  /**
   * Decrypts serialized ciphertext using a password.
   *
   * @param {Cipher} cipher The cipher algorithm to use.
   * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
   * @param {string} password The password.
   * @param {Object} cfg (Optional) The configuration options to use for this operation.
   *
   * @return {WordArray} The plaintext.
   *
   * @static
   *
   * @example
   *
   *     var plaintext = CryptoJS.lib.PasswordBasedCipher
   *       .decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password',
   *         { format: CryptoJS.format.OpenSSL });
   *     var plaintext = CryptoJS.lib.PasswordBasedCipher
   *       .decrypt(CryptoJS.algo.AES, ciphertextParams, 'password',
   *         { format: CryptoJS.format.OpenSSL });
   */
  static decrypt(cipher, ciphertext, password, cfg) {
    let _ciphertext = ciphertext;
    const _cfg = Object.assign(new Base(), this.cfg, cfg);
    _ciphertext = this._parse(_ciphertext, _cfg.format);
    const derivedParams = _cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, _ciphertext.salt, _cfg.hasher);
    _cfg.iv = derivedParams.iv;
    const plaintext = SerializableCipher.decrypt.call(this, cipher, _ciphertext, derivedParams.key, _cfg);
    return plaintext;
  }
};
PasswordBasedCipher.cfg = Object.assign(SerializableCipher.cfg, { kdf: OpenSSLKdf });

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/enc-utf16.js
var swapEndian = (word) => word << 8 & 4278255360 | word >>> 8 & 16711935;
var Utf16BE = {
  /**
   * Converts a word array to a UTF-16 BE string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The UTF-16 BE string.
   *
   * @static
   *
   * @example
   *
   *     const utf16String = CryptoJS.enc.Utf16.stringify(wordArray);
   */
  stringify(wordArray) {
    const { words, sigBytes } = wordArray;
    const utf16Chars = [];
    for (let i3 = 0; i3 < sigBytes; i3 += 2) {
      const codePoint = words[i3 >>> 2] >>> 16 - i3 % 4 * 8 & 65535;
      utf16Chars.push(String.fromCharCode(codePoint));
    }
    return utf16Chars.join("");
  },
  /**
   * Converts a UTF-16 BE string to a word array.
   *
   * @param {string} utf16Str The UTF-16 BE string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     const wordArray = CryptoJS.enc.Utf16.parse(utf16String);
   */
  parse(utf16Str) {
    const utf16StrLength = utf16Str.length;
    const words = [];
    for (let i3 = 0; i3 < utf16StrLength; i3 += 1) {
      words[i3 >>> 1] |= utf16Str.charCodeAt(i3) << 16 - i3 % 2 * 16;
    }
    return WordArray.create(words, utf16StrLength * 2);
  }
};
var Utf16 = Utf16BE;
var Utf16LE = {
  /**
   * Converts a word array to a UTF-16 LE string.
   *
   * @param {WordArray} wordArray The word array.
   *
   * @return {string} The UTF-16 LE string.
   *
   * @static
   *
   * @example
   *
   *     const utf16Str = CryptoJS.enc.Utf16LE.stringify(wordArray);
   */
  stringify(wordArray) {
    const { words, sigBytes } = wordArray;
    const utf16Chars = [];
    for (let i3 = 0; i3 < sigBytes; i3 += 2) {
      const codePoint = swapEndian(words[i3 >>> 2] >>> 16 - i3 % 4 * 8 & 65535);
      utf16Chars.push(String.fromCharCode(codePoint));
    }
    return utf16Chars.join("");
  },
  /**
   * Converts a UTF-16 LE string to a word array.
   *
   * @param {string} utf16Str The UTF-16 LE string.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     const wordArray = CryptoJS.enc.Utf16LE.parse(utf16Str);
   */
  parse(utf16Str) {
    const utf16StrLength = utf16Str.length;
    const words = [];
    for (let i3 = 0; i3 < utf16StrLength; i3 += 1) {
      words[i3 >>> 1] |= swapEndian(utf16Str.charCodeAt(i3) << 16 - i3 % 2 * 16);
    }
    return WordArray.create(words, utf16StrLength * 2);
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/enc-base64url.js
var Base64url = {
  /**
   * Converts a word array to a Base64url string.
   *
   * @param {WordArray} wordArray The word array.
   * 
   * @param {boolean} urlSafe Whether to use url safe.
   *
   * @return {string} The Base64url string.
   *
   * @static
   *
   * @example
   *
   *     const base64String = CryptoJS.enc.Base64.stringify(wordArray);
   */
  stringify(wordArray, urlSafe = true) {
    const { words, sigBytes } = wordArray;
    const map = urlSafe ? this._safeMap : this._map;
    wordArray.clamp();
    const base64Chars = [];
    for (let i3 = 0; i3 < sigBytes; i3 += 3) {
      const byte1 = words[i3 >>> 2] >>> 24 - i3 % 4 * 8 & 255;
      const byte2 = words[i3 + 1 >>> 2] >>> 24 - (i3 + 1) % 4 * 8 & 255;
      const byte3 = words[i3 + 2 >>> 2] >>> 24 - (i3 + 2) % 4 * 8 & 255;
      const triplet = byte1 << 16 | byte2 << 8 | byte3;
      for (let j = 0; j < 4 && i3 + j * 0.75 < sigBytes; j += 1) {
        base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
      }
    }
    const paddingChar = map.charAt(64);
    if (paddingChar) {
      while (base64Chars.length % 4) {
        base64Chars.push(paddingChar);
      }
    }
    return base64Chars.join("");
  },
  /**
   * Converts a Base64url string to a word array.
   *
   * @param {string} base64Str The Base64url string.
   * 
   * @param {boolean} urlSafe Whether to use url safe.
   *
   * @return {WordArray} The word array.
   *
   * @static
   *
   * @example
   *
   *     const wordArray = CryptoJS.enc.Base64.parse(base64String);
   */
  parse(base64Str, urlSafe = true) {
    let base64StrLength = base64Str.length;
    const map = urlSafe ? this._safeMap : this._map;
    let reverseMap = this._reverseMap;
    if (!reverseMap) {
      this._reverseMap = [];
      reverseMap = this._reverseMap;
      for (let j = 0; j < map.length; j += 1) {
        reverseMap[map.charCodeAt(j)] = j;
      }
    }
    const paddingChar = map.charAt(64);
    if (paddingChar) {
      const paddingIndex = base64Str.indexOf(paddingChar);
      if (paddingIndex !== -1) {
        base64StrLength = paddingIndex;
      }
    }
    return parseLoop(base64Str, base64StrLength, reverseMap);
  },
  _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  _safeMap: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/sha1.js
var W = [];
var SHA1Algo = class extends Hasher {
  _doReset() {
    this._hash = new WordArray([
      1732584193,
      4023233417,
      2562383102,
      271733878,
      3285377520
    ]);
  }
  _doProcessBlock(M, offset) {
    const H2 = this._hash.words;
    let a = H2[0];
    let b = H2[1];
    let c = H2[2];
    let d2 = H2[3];
    let e = H2[4];
    for (let i3 = 0; i3 < 80; i3 += 1) {
      if (i3 < 16) {
        W[i3] = M[offset + i3] | 0;
      } else {
        const n2 = W[i3 - 3] ^ W[i3 - 8] ^ W[i3 - 14] ^ W[i3 - 16];
        W[i3] = n2 << 1 | n2 >>> 31;
      }
      let t = (a << 5 | a >>> 27) + e + W[i3];
      if (i3 < 20) {
        t += (b & c | ~b & d2) + 1518500249;
      } else if (i3 < 40) {
        t += (b ^ c ^ d2) + 1859775393;
      } else if (i3 < 60) {
        t += (b & c | b & d2 | c & d2) - 1894007588;
      } else {
        t += (b ^ c ^ d2) - 899497514;
      }
      e = d2;
      d2 = c;
      c = b << 30 | b >>> 2;
      b = a;
      a = t;
    }
    H2[0] = H2[0] + a | 0;
    H2[1] = H2[1] + b | 0;
    H2[2] = H2[2] + c | 0;
    H2[3] = H2[3] + d2 | 0;
    H2[4] = H2[4] + e | 0;
  }
  _doFinalize() {
    const data = this._data;
    const dataWords = data.words;
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = data.sigBytes * 8;
    dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(nBitsTotal / 4294967296);
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
    data.sigBytes = dataWords.length * 4;
    this._process();
    return this._hash;
  }
  clone() {
    const clone = super.clone.call(this);
    clone._hash = this._hash.clone();
    return clone;
  }
};
var SHA1 = Hasher._createHelper(SHA1Algo);
var HmacSHA1 = Hasher._createHmacHelper(SHA1Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/sha256.js
var H = [];
var K = [];
var isPrime = (n2) => {
  const sqrtN = Math.sqrt(n2);
  for (let factor = 2; factor <= sqrtN; factor += 1) {
    if (!(n2 % factor)) {
      return false;
    }
  }
  return true;
};
var getFractionalBits = (n2) => (n2 - (n2 | 0)) * 4294967296 | 0;
var n = 2;
var nPrime = 0;
while (nPrime < 64) {
  if (isPrime(n)) {
    if (nPrime < 8) {
      H[nPrime] = getFractionalBits(n ** (1 / 2));
    }
    K[nPrime] = getFractionalBits(n ** (1 / 3));
    nPrime += 1;
  }
  n += 1;
}
var W2 = [];
var SHA256Algo = class extends Hasher {
  _doReset() {
    this._hash = new WordArray(H.slice(0));
  }
  _doProcessBlock(M, offset) {
    const _H = this._hash.words;
    let a = _H[0];
    let b = _H[1];
    let c = _H[2];
    let d2 = _H[3];
    let e = _H[4];
    let f6 = _H[5];
    let g = _H[6];
    let h = _H[7];
    for (let i3 = 0; i3 < 64; i3 += 1) {
      if (i3 < 16) {
        W2[i3] = M[offset + i3] | 0;
      } else {
        const gamma0x = W2[i3 - 15];
        const gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
        const gamma1x = W2[i3 - 2];
        const gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
        W2[i3] = gamma0 + W2[i3 - 7] + gamma1 + W2[i3 - 16];
      }
      const ch = e & f6 ^ ~e & g;
      const maj = a & b ^ a & c ^ b & c;
      const sigma0 = (a << 30 | a >>> 2) ^ (a << 19 | a >>> 13) ^ (a << 10 | a >>> 22);
      const sigma1 = (e << 26 | e >>> 6) ^ (e << 21 | e >>> 11) ^ (e << 7 | e >>> 25);
      const t1 = h + sigma1 + ch + K[i3] + W2[i3];
      const t2 = sigma0 + maj;
      h = g;
      g = f6;
      f6 = e;
      e = d2 + t1 | 0;
      d2 = c;
      c = b;
      b = a;
      a = t1 + t2 | 0;
    }
    _H[0] = _H[0] + a | 0;
    _H[1] = _H[1] + b | 0;
    _H[2] = _H[2] + c | 0;
    _H[3] = _H[3] + d2 | 0;
    _H[4] = _H[4] + e | 0;
    _H[5] = _H[5] + f6 | 0;
    _H[6] = _H[6] + g | 0;
    _H[7] = _H[7] + h | 0;
  }
  _doFinalize() {
    const data = this._data;
    const dataWords = data.words;
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = data.sigBytes * 8;
    dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(nBitsTotal / 4294967296);
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
    data.sigBytes = dataWords.length * 4;
    this._process();
    return this._hash;
  }
  clone() {
    const clone = super.clone.call(this);
    clone._hash = this._hash.clone();
    return clone;
  }
};
var SHA256 = Hasher._createHelper(SHA256Algo);
var HmacSHA256 = Hasher._createHmacHelper(SHA256Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/sha224.js
var SHA224Algo = class extends SHA256Algo {
  _doReset() {
    this._hash = new WordArray([
      3238371032,
      914150663,
      812702999,
      4144912697,
      4290775857,
      1750603025,
      1694076839,
      3204075428
    ]);
  }
  _doFinalize() {
    const hash = super._doFinalize.call(this);
    hash.sigBytes -= 4;
    return hash;
  }
};
var SHA224 = SHA256Algo._createHelper(SHA224Algo);
var HmacSHA224 = SHA256Algo._createHmacHelper(SHA224Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/sha512.js
var K2 = [
  new X64Word(1116352408, 3609767458),
  new X64Word(1899447441, 602891725),
  new X64Word(3049323471, 3964484399),
  new X64Word(3921009573, 2173295548),
  new X64Word(961987163, 4081628472),
  new X64Word(1508970993, 3053834265),
  new X64Word(2453635748, 2937671579),
  new X64Word(2870763221, 3664609560),
  new X64Word(3624381080, 2734883394),
  new X64Word(310598401, 1164996542),
  new X64Word(607225278, 1323610764),
  new X64Word(1426881987, 3590304994),
  new X64Word(1925078388, 4068182383),
  new X64Word(2162078206, 991336113),
  new X64Word(2614888103, 633803317),
  new X64Word(3248222580, 3479774868),
  new X64Word(3835390401, 2666613458),
  new X64Word(4022224774, 944711139),
  new X64Word(264347078, 2341262773),
  new X64Word(604807628, 2007800933),
  new X64Word(770255983, 1495990901),
  new X64Word(1249150122, 1856431235),
  new X64Word(1555081692, 3175218132),
  new X64Word(1996064986, 2198950837),
  new X64Word(2554220882, 3999719339),
  new X64Word(2821834349, 766784016),
  new X64Word(2952996808, 2566594879),
  new X64Word(3210313671, 3203337956),
  new X64Word(3336571891, 1034457026),
  new X64Word(3584528711, 2466948901),
  new X64Word(113926993, 3758326383),
  new X64Word(338241895, 168717936),
  new X64Word(666307205, 1188179964),
  new X64Word(773529912, 1546045734),
  new X64Word(1294757372, 1522805485),
  new X64Word(1396182291, 2643833823),
  new X64Word(1695183700, 2343527390),
  new X64Word(1986661051, 1014477480),
  new X64Word(2177026350, 1206759142),
  new X64Word(2456956037, 344077627),
  new X64Word(2730485921, 1290863460),
  new X64Word(2820302411, 3158454273),
  new X64Word(3259730800, 3505952657),
  new X64Word(3345764771, 106217008),
  new X64Word(3516065817, 3606008344),
  new X64Word(3600352804, 1432725776),
  new X64Word(4094571909, 1467031594),
  new X64Word(275423344, 851169720),
  new X64Word(430227734, 3100823752),
  new X64Word(506948616, 1363258195),
  new X64Word(659060556, 3750685593),
  new X64Word(883997877, 3785050280),
  new X64Word(958139571, 3318307427),
  new X64Word(1322822218, 3812723403),
  new X64Word(1537002063, 2003034995),
  new X64Word(1747873779, 3602036899),
  new X64Word(1955562222, 1575990012),
  new X64Word(2024104815, 1125592928),
  new X64Word(2227730452, 2716904306),
  new X64Word(2361852424, 442776044),
  new X64Word(2428436474, 593698344),
  new X64Word(2756734187, 3733110249),
  new X64Word(3204031479, 2999351573),
  new X64Word(3329325298, 3815920427),
  new X64Word(3391569614, 3928383900),
  new X64Word(3515267271, 566280711),
  new X64Word(3940187606, 3454069534),
  new X64Word(4118630271, 4000239992),
  new X64Word(116418474, 1914138554),
  new X64Word(174292421, 2731055270),
  new X64Word(289380356, 3203993006),
  new X64Word(460393269, 320620315),
  new X64Word(685471733, 587496836),
  new X64Word(852142971, 1086792851),
  new X64Word(1017036298, 365543100),
  new X64Word(1126000580, 2618297676),
  new X64Word(1288033470, 3409855158),
  new X64Word(1501505948, 4234509866),
  new X64Word(1607167915, 987167468),
  new X64Word(1816402316, 1246189591)
];
var W3 = [];
for (let i3 = 0; i3 < 80; i3 += 1) {
  W3[i3] = new X64Word();
}
var SHA512Algo = class extends Hasher {
  constructor() {
    super();
    this.blockSize = 1024 / 32;
  }
  _doReset() {
    this._hash = new X64WordArray([
      new X64Word(1779033703, 4089235720),
      new X64Word(3144134277, 2227873595),
      new X64Word(1013904242, 4271175723),
      new X64Word(2773480762, 1595750129),
      new X64Word(1359893119, 2917565137),
      new X64Word(2600822924, 725511199),
      new X64Word(528734635, 4215389547),
      new X64Word(1541459225, 327033209)
    ]);
  }
  _doProcessBlock(M, offset) {
    const H2 = this._hash.words;
    const H0 = H2[0];
    const H1 = H2[1];
    const H22 = H2[2];
    const H3 = H2[3];
    const H4 = H2[4];
    const H5 = H2[5];
    const H6 = H2[6];
    const H7 = H2[7];
    const H0h = H0.high;
    let H0l = H0.low;
    const H1h = H1.high;
    let H1l = H1.low;
    const H2h = H22.high;
    let H2l = H22.low;
    const H3h = H3.high;
    let H3l = H3.low;
    const H4h = H4.high;
    let H4l = H4.low;
    const H5h = H5.high;
    let H5l = H5.low;
    const H6h = H6.high;
    let H6l = H6.low;
    const H7h = H7.high;
    let H7l = H7.low;
    let ah = H0h;
    let al = H0l;
    let bh = H1h;
    let bl = H1l;
    let ch = H2h;
    let cl = H2l;
    let dh = H3h;
    let dl = H3l;
    let eh = H4h;
    let el = H4l;
    let fh = H5h;
    let fl = H5l;
    let gh = H6h;
    let gl = H6l;
    let hh = H7h;
    let hl = H7l;
    for (let i3 = 0; i3 < 80; i3 += 1) {
      let Wil;
      let Wih;
      const Wi = W3[i3];
      if (i3 < 16) {
        Wi.high = M[offset + i3 * 2] | 0;
        Wih = Wi.high;
        Wi.low = M[offset + i3 * 2 + 1] | 0;
        Wil = Wi.low;
      } else {
        const gamma0x = W3[i3 - 15];
        const gamma0xh = gamma0x.high;
        const gamma0xl = gamma0x.low;
        const gamma0h = (gamma0xh >>> 1 | gamma0xl << 31) ^ (gamma0xh >>> 8 | gamma0xl << 24) ^ gamma0xh >>> 7;
        const gamma0l = (gamma0xl >>> 1 | gamma0xh << 31) ^ (gamma0xl >>> 8 | gamma0xh << 24) ^ (gamma0xl >>> 7 | gamma0xh << 25);
        const gamma1x = W3[i3 - 2];
        const gamma1xh = gamma1x.high;
        const gamma1xl = gamma1x.low;
        const gamma1h = (gamma1xh >>> 19 | gamma1xl << 13) ^ (gamma1xh << 3 | gamma1xl >>> 29) ^ gamma1xh >>> 6;
        const gamma1l = (gamma1xl >>> 19 | gamma1xh << 13) ^ (gamma1xl << 3 | gamma1xh >>> 29) ^ (gamma1xl >>> 6 | gamma1xh << 26);
        const Wi7 = W3[i3 - 7];
        const Wi7h = Wi7.high;
        const Wi7l = Wi7.low;
        const Wi16 = W3[i3 - 16];
        const Wi16h = Wi16.high;
        const Wi16l = Wi16.low;
        Wil = gamma0l + Wi7l;
        Wih = gamma0h + Wi7h + (Wil >>> 0 < gamma0l >>> 0 ? 1 : 0);
        Wil += gamma1l;
        Wih = Wih + gamma1h + (Wil >>> 0 < gamma1l >>> 0 ? 1 : 0);
        Wil += Wi16l;
        Wih = Wih + Wi16h + (Wil >>> 0 < Wi16l >>> 0 ? 1 : 0);
        Wi.high = Wih;
        Wi.low = Wil;
      }
      const chh = eh & fh ^ ~eh & gh;
      const chl = el & fl ^ ~el & gl;
      const majh = ah & bh ^ ah & ch ^ bh & ch;
      const majl = al & bl ^ al & cl ^ bl & cl;
      const sigma0h = (ah >>> 28 | al << 4) ^ (ah << 30 | al >>> 2) ^ (ah << 25 | al >>> 7);
      const sigma0l = (al >>> 28 | ah << 4) ^ (al << 30 | ah >>> 2) ^ (al << 25 | ah >>> 7);
      const sigma1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (eh << 23 | el >>> 9);
      const sigma1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (el << 23 | eh >>> 9);
      const Ki = K2[i3];
      const Kih = Ki.high;
      const Kil = Ki.low;
      let t1l = hl + sigma1l;
      let t1h = hh + sigma1h + (t1l >>> 0 < hl >>> 0 ? 1 : 0);
      t1l += chl;
      t1h = t1h + chh + (t1l >>> 0 < chl >>> 0 ? 1 : 0);
      t1l += Kil;
      t1h = t1h + Kih + (t1l >>> 0 < Kil >>> 0 ? 1 : 0);
      t1l += Wil;
      t1h = t1h + Wih + (t1l >>> 0 < Wil >>> 0 ? 1 : 0);
      const t2l = sigma0l + majl;
      const t2h = sigma0h + majh + (t2l >>> 0 < sigma0l >>> 0 ? 1 : 0);
      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      el = dl + t1l | 0;
      eh = dh + t1h + (el >>> 0 < dl >>> 0 ? 1 : 0) | 0;
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      al = t1l + t2l | 0;
      ah = t1h + t2h + (al >>> 0 < t1l >>> 0 ? 1 : 0) | 0;
    }
    H0.low = H0l + al;
    H0l = H0.low;
    H0.high = H0h + ah + (H0l >>> 0 < al >>> 0 ? 1 : 0);
    H1.low = H1l + bl;
    H1l = H1.low;
    H1.high = H1h + bh + (H1l >>> 0 < bl >>> 0 ? 1 : 0);
    H22.low = H2l + cl;
    H2l = H22.low;
    H22.high = H2h + ch + (H2l >>> 0 < cl >>> 0 ? 1 : 0);
    H3.low = H3l + dl;
    H3l = H3.low;
    H3.high = H3h + dh + (H3l >>> 0 < dl >>> 0 ? 1 : 0);
    H4.low = H4l + el;
    H4l = H4.low;
    H4.high = H4h + eh + (H4l >>> 0 < el >>> 0 ? 1 : 0);
    H5.low = H5l + fl;
    H5l = H5.low;
    H5.high = H5h + fh + (H5l >>> 0 < fl >>> 0 ? 1 : 0);
    H6.low = H6l + gl;
    H6l = H6.low;
    H6.high = H6h + gh + (H6l >>> 0 < gl >>> 0 ? 1 : 0);
    H7.low = H7l + hl;
    H7l = H7.low;
    H7.high = H7h + hh + (H7l >>> 0 < hl >>> 0 ? 1 : 0);
  }
  _doFinalize() {
    const data = this._data;
    const dataWords = data.words;
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = data.sigBytes * 8;
    dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    dataWords[(nBitsLeft + 128 >>> 10 << 5) + 30] = Math.floor(nBitsTotal / 4294967296);
    dataWords[(nBitsLeft + 128 >>> 10 << 5) + 31] = nBitsTotal;
    data.sigBytes = dataWords.length * 4;
    this._process();
    const hash = this._hash.toX32();
    return hash;
  }
  clone() {
    const clone = super.clone.call(this);
    clone._hash = this._hash.clone();
    return clone;
  }
};
var SHA512 = Hasher._createHelper(SHA512Algo);
var HmacSHA512 = Hasher._createHmacHelper(SHA512Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/sha384.js
var SHA384Algo = class extends SHA512Algo {
  _doReset() {
    this._hash = new X64WordArray([
      new X64Word(3418070365, 3238371032),
      new X64Word(1654270250, 914150663),
      new X64Word(2438529370, 812702999),
      new X64Word(355462360, 4144912697),
      new X64Word(1731405415, 4290775857),
      new X64Word(2394180231, 1750603025),
      new X64Word(3675008525, 1694076839),
      new X64Word(1203062813, 3204075428)
    ]);
  }
  _doFinalize() {
    const hash = super._doFinalize.call(this);
    hash.sigBytes -= 16;
    return hash;
  }
};
var SHA384 = SHA512Algo._createHelper(SHA384Algo);
var HmacSHA384 = SHA512Algo._createHmacHelper(SHA384Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/sha3.js
var RHO_OFFSETS = [];
var PI_INDEXES = [];
var ROUND_CONSTANTS = [];
var _x = 1;
var _y = 0;
for (let t = 0; t < 24; t += 1) {
  RHO_OFFSETS[_x + 5 * _y] = (t + 1) * (t + 2) / 2 % 64;
  const newX = _y % 5;
  const newY = (2 * _x + 3 * _y) % 5;
  _x = newX;
  _y = newY;
}
for (let x2 = 0; x2 < 5; x2 += 1) {
  for (let y = 0; y < 5; y += 1) {
    PI_INDEXES[x2 + 5 * y] = y + (2 * x2 + 3 * y) % 5 * 5;
  }
}
var LFSR = 1;
for (let i3 = 0; i3 < 24; i3 += 1) {
  let roundConstantMsw = 0;
  let roundConstantLsw = 0;
  for (let j = 0; j < 7; j += 1) {
    if (LFSR & 1) {
      const bitPosition = (1 << j) - 1;
      if (bitPosition < 32) {
        roundConstantLsw ^= 1 << bitPosition;
      } else {
        roundConstantMsw ^= 1 << bitPosition - 32;
      }
    }
    if (LFSR & 128) {
      LFSR = LFSR << 1 ^ 113;
    } else {
      LFSR <<= 1;
    }
  }
  ROUND_CONSTANTS[i3] = X64Word.create(roundConstantMsw, roundConstantLsw);
}
var T2 = [];
for (let i3 = 0; i3 < 25; i3 += 1) {
  T2[i3] = X64Word.create();
}
var SHA3Algo = class extends Hasher {
  constructor(cfg) {
    super(Object.assign(
      { outputLength: 512 },
      cfg
    ));
  }
  _doReset() {
    this._state = [];
    const state = this._state;
    for (let i3 = 0; i3 < 25; i3 += 1) {
      state[i3] = new X64Word();
    }
    this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
  }
  _doProcessBlock(M, offset) {
    const state = this._state;
    const nBlockSizeLanes = this.blockSize / 2;
    for (let i3 = 0; i3 < nBlockSizeLanes; i3 += 1) {
      let M2i = M[offset + 2 * i3];
      let M2i1 = M[offset + 2 * i3 + 1];
      M2i = (M2i << 8 | M2i >>> 24) & 16711935 | (M2i << 24 | M2i >>> 8) & 4278255360;
      M2i1 = (M2i1 << 8 | M2i1 >>> 24) & 16711935 | (M2i1 << 24 | M2i1 >>> 8) & 4278255360;
      const lane = state[i3];
      lane.high ^= M2i1;
      lane.low ^= M2i;
    }
    for (let round = 0; round < 24; round += 1) {
      for (let x2 = 0; x2 < 5; x2 += 1) {
        let tMsw = 0;
        let tLsw = 0;
        for (let y = 0; y < 5; y += 1) {
          const lane2 = state[x2 + 5 * y];
          tMsw ^= lane2.high;
          tLsw ^= lane2.low;
        }
        const Tx = T2[x2];
        Tx.high = tMsw;
        Tx.low = tLsw;
      }
      for (let x2 = 0; x2 < 5; x2 += 1) {
        const Tx4 = T2[(x2 + 4) % 5];
        const Tx1 = T2[(x2 + 1) % 5];
        const Tx1Msw = Tx1.high;
        const Tx1Lsw = Tx1.low;
        const tMsw = Tx4.high ^ (Tx1Msw << 1 | Tx1Lsw >>> 31);
        const tLsw = Tx4.low ^ (Tx1Lsw << 1 | Tx1Msw >>> 31);
        for (let y = 0; y < 5; y += 1) {
          const lane2 = state[x2 + 5 * y];
          lane2.high ^= tMsw;
          lane2.low ^= tLsw;
        }
      }
      for (let laneIndex = 1; laneIndex < 25; laneIndex += 1) {
        let tMsw;
        let tLsw;
        const lane2 = state[laneIndex];
        const laneMsw = lane2.high;
        const laneLsw = lane2.low;
        const rhoOffset = RHO_OFFSETS[laneIndex];
        if (rhoOffset < 32) {
          tMsw = laneMsw << rhoOffset | laneLsw >>> 32 - rhoOffset;
          tLsw = laneLsw << rhoOffset | laneMsw >>> 32 - rhoOffset;
        } else {
          tMsw = laneLsw << rhoOffset - 32 | laneMsw >>> 64 - rhoOffset;
          tLsw = laneMsw << rhoOffset - 32 | laneLsw >>> 64 - rhoOffset;
        }
        const TPiLane = T2[PI_INDEXES[laneIndex]];
        TPiLane.high = tMsw;
        TPiLane.low = tLsw;
      }
      const T02 = T2[0];
      const state0 = state[0];
      T02.high = state0.high;
      T02.low = state0.low;
      for (let x2 = 0; x2 < 5; x2 += 1) {
        for (let y = 0; y < 5; y += 1) {
          const laneIndex = x2 + 5 * y;
          const lane2 = state[laneIndex];
          const TLane = T2[laneIndex];
          const Tx1Lane = T2[(x2 + 1) % 5 + 5 * y];
          const Tx2Lane = T2[(x2 + 2) % 5 + 5 * y];
          lane2.high = TLane.high ^ ~Tx1Lane.high & Tx2Lane.high;
          lane2.low = TLane.low ^ ~Tx1Lane.low & Tx2Lane.low;
        }
      }
      const lane = state[0];
      const roundConstant = ROUND_CONSTANTS[round];
      lane.high ^= roundConstant.high;
      lane.low ^= roundConstant.low;
    }
  }
  _doFinalize() {
    const data = this._data;
    const dataWords = data.words;
    const nBitsLeft = data.sigBytes * 8;
    const blockSizeBits = this.blockSize * 32;
    dataWords[nBitsLeft >>> 5] |= 1 << 24 - nBitsLeft % 32;
    dataWords[(Math.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits >>> 5) - 1] |= 128;
    data.sigBytes = dataWords.length * 4;
    this._process();
    const state = this._state;
    const outputLengthBytes = this.cfg.outputLength / 8;
    const outputLengthLanes = outputLengthBytes / 8;
    const hashWords = [];
    for (let i3 = 0; i3 < outputLengthLanes; i3 += 1) {
      const lane = state[i3];
      let laneMsw = lane.high;
      let laneLsw = lane.low;
      laneMsw = (laneMsw << 8 | laneMsw >>> 24) & 16711935 | (laneMsw << 24 | laneMsw >>> 8) & 4278255360;
      laneLsw = (laneLsw << 8 | laneLsw >>> 24) & 16711935 | (laneLsw << 24 | laneLsw >>> 8) & 4278255360;
      hashWords.push(laneLsw);
      hashWords.push(laneMsw);
    }
    return new WordArray(hashWords, outputLengthBytes);
  }
  clone() {
    const clone = super.clone.call(this);
    clone._state = this._state.slice(0);
    const state = clone._state;
    for (let i3 = 0; i3 < 25; i3 += 1) {
      state[i3] = state[i3].clone();
    }
    return clone;
  }
};
var SHA3 = Hasher._createHelper(SHA3Algo);
var HmacSHA3 = Hasher._createHmacHelper(SHA3Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/ripemd160.js
var _zl = WordArray.create([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  7,
  4,
  13,
  1,
  10,
  6,
  15,
  3,
  12,
  0,
  9,
  5,
  2,
  14,
  11,
  8,
  3,
  10,
  14,
  4,
  9,
  15,
  8,
  1,
  2,
  7,
  0,
  6,
  13,
  11,
  5,
  12,
  1,
  9,
  11,
  10,
  0,
  8,
  12,
  4,
  13,
  3,
  7,
  15,
  14,
  5,
  6,
  2,
  4,
  0,
  5,
  9,
  7,
  12,
  2,
  10,
  14,
  1,
  3,
  8,
  11,
  6,
  15,
  13
]);
var _zr = WordArray.create([
  5,
  14,
  7,
  0,
  9,
  2,
  11,
  4,
  13,
  6,
  15,
  8,
  1,
  10,
  3,
  12,
  6,
  11,
  3,
  7,
  0,
  13,
  5,
  10,
  14,
  15,
  8,
  12,
  4,
  9,
  1,
  2,
  15,
  5,
  1,
  3,
  7,
  14,
  6,
  9,
  11,
  8,
  12,
  2,
  10,
  0,
  4,
  13,
  8,
  6,
  4,
  1,
  3,
  11,
  15,
  0,
  5,
  12,
  2,
  13,
  9,
  7,
  10,
  14,
  12,
  15,
  10,
  4,
  1,
  5,
  8,
  7,
  6,
  2,
  13,
  14,
  0,
  3,
  9,
  11
]);
var _sl = WordArray.create([
  11,
  14,
  15,
  12,
  5,
  8,
  7,
  9,
  11,
  13,
  14,
  15,
  6,
  7,
  9,
  8,
  7,
  6,
  8,
  13,
  11,
  9,
  7,
  15,
  7,
  12,
  15,
  9,
  11,
  7,
  13,
  12,
  11,
  13,
  6,
  7,
  14,
  9,
  13,
  15,
  14,
  8,
  13,
  6,
  5,
  12,
  7,
  5,
  11,
  12,
  14,
  15,
  14,
  15,
  9,
  8,
  9,
  14,
  5,
  6,
  8,
  6,
  5,
  12,
  9,
  15,
  5,
  11,
  6,
  8,
  13,
  12,
  5,
  12,
  13,
  14,
  11,
  8,
  5,
  6
]);
var _sr = WordArray.create([
  8,
  9,
  9,
  11,
  13,
  15,
  15,
  5,
  7,
  7,
  8,
  11,
  14,
  14,
  12,
  6,
  9,
  13,
  15,
  7,
  12,
  8,
  9,
  11,
  7,
  7,
  12,
  7,
  6,
  15,
  13,
  11,
  9,
  7,
  15,
  11,
  8,
  6,
  6,
  14,
  12,
  13,
  5,
  14,
  13,
  13,
  7,
  5,
  15,
  5,
  8,
  11,
  14,
  14,
  6,
  14,
  6,
  9,
  12,
  9,
  12,
  5,
  15,
  8,
  8,
  5,
  12,
  9,
  12,
  5,
  14,
  6,
  8,
  13,
  6,
  5,
  15,
  13,
  11,
  11
]);
var _hl = WordArray.create([0, 1518500249, 1859775393, 2400959708, 2840853838]);
var _hr = WordArray.create([1352829926, 1548603684, 1836072691, 2053994217, 0]);
var f1 = (x2, y, z) => x2 ^ y ^ z;
var f2 = (x2, y, z) => x2 & y | ~x2 & z;
var f3 = (x2, y, z) => (x2 | ~y) ^ z;
var f4 = (x2, y, z) => x2 & z | y & ~z;
var f5 = (x2, y, z) => x2 ^ (y | ~z);
var rotl = (x2, n2) => x2 << n2 | x2 >>> 32 - n2;
var RIPEMD160Algo = class extends Hasher {
  _doReset() {
    this._hash = WordArray.create([1732584193, 4023233417, 2562383102, 271733878, 3285377520]);
  }
  _doProcessBlock(M, offset) {
    const _M = M;
    for (let i3 = 0; i3 < 16; i3 += 1) {
      const offset_i = offset + i3;
      const M_offset_i = _M[offset_i];
      _M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 16711935 | (M_offset_i << 24 | M_offset_i >>> 8) & 4278255360;
    }
    const H2 = this._hash.words;
    const hl = _hl.words;
    const hr = _hr.words;
    const zl = _zl.words;
    const zr = _zr.words;
    const sl = _sl.words;
    const sr = _sr.words;
    let al = H2[0];
    let bl = H2[1];
    let cl = H2[2];
    let dl = H2[3];
    let el = H2[4];
    let ar = H2[0];
    let br = H2[1];
    let cr = H2[2];
    let dr = H2[3];
    let er = H2[4];
    let t;
    for (let i3 = 0; i3 < 80; i3 += 1) {
      t = al + _M[offset + zl[i3]] | 0;
      if (i3 < 16) {
        t += f1(bl, cl, dl) + hl[0];
      } else if (i3 < 32) {
        t += f2(bl, cl, dl) + hl[1];
      } else if (i3 < 48) {
        t += f3(bl, cl, dl) + hl[2];
      } else if (i3 < 64) {
        t += f4(bl, cl, dl) + hl[3];
      } else {
        t += f5(bl, cl, dl) + hl[4];
      }
      t |= 0;
      t = rotl(t, sl[i3]);
      t = t + el | 0;
      al = el;
      el = dl;
      dl = rotl(cl, 10);
      cl = bl;
      bl = t;
      t = ar + _M[offset + zr[i3]] | 0;
      if (i3 < 16) {
        t += f5(br, cr, dr) + hr[0];
      } else if (i3 < 32) {
        t += f4(br, cr, dr) + hr[1];
      } else if (i3 < 48) {
        t += f3(br, cr, dr) + hr[2];
      } else if (i3 < 64) {
        t += f2(br, cr, dr) + hr[3];
      } else {
        t += f1(br, cr, dr) + hr[4];
      }
      t |= 0;
      t = rotl(t, sr[i3]);
      t = t + er | 0;
      ar = er;
      er = dr;
      dr = rotl(cr, 10);
      cr = br;
      br = t;
    }
    t = H2[1] + cl + dr | 0;
    H2[1] = H2[2] + dl + er | 0;
    H2[2] = H2[3] + el + ar | 0;
    H2[3] = H2[4] + al + br | 0;
    H2[4] = H2[0] + bl + cr | 0;
    H2[0] = t;
  }
  _doFinalize() {
    const data = this._data;
    const dataWords = data.words;
    const nBitsTotal = this._nDataBytes * 8;
    const nBitsLeft = data.sigBytes * 8;
    dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
    dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotal << 8 | nBitsTotal >>> 24) & 16711935 | (nBitsTotal << 24 | nBitsTotal >>> 8) & 4278255360;
    data.sigBytes = (dataWords.length + 1) * 4;
    this._process();
    const hash = this._hash;
    const H2 = hash.words;
    for (let i3 = 0; i3 < 5; i3 += 1) {
      const H_i = H2[i3];
      H2[i3] = (H_i << 8 | H_i >>> 24) & 16711935 | (H_i << 24 | H_i >>> 8) & 4278255360;
    }
    return hash;
  }
  clone() {
    const clone = super.clone.call(this);
    clone._hash = this._hash.clone();
    return clone;
  }
};
var RIPEMD160 = Hasher._createHelper(RIPEMD160Algo);
var HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160Algo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/pbkdf2.js
var PBKDF2Algo = class extends Base {
  /**
   * Initializes a newly created key derivation function.
   *
   * @param {Object} cfg (Optional) The configuration options to use for the derivation.
   *
   * @example
   *
   *     const kdf = CryptoJS.algo.PBKDF2.create();
   *     const kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
   *     const kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
   */
  constructor(cfg) {
    super();
    this.cfg = Object.assign(
      new Base(),
      {
        keySize: 128 / 32,
        hasher: SHA256Algo,
        iterations: 25e4
      },
      cfg
    );
  }
  /**
   * Computes the Password-Based Key Derivation Function 2.
   *
   * @param {WordArray|string} password The password.
   * @param {WordArray|string} salt A salt.
   *
   * @return {WordArray} The derived key.
   *
   * @example
   *
   *     const key = kdf.compute(password, salt);
   */
  compute(password, salt) {
    const { cfg } = this;
    const hmac = HMAC.create(cfg.hasher, password);
    const derivedKey = WordArray.create();
    const blockIndex = WordArray.create([1]);
    const derivedKeyWords = derivedKey.words;
    const blockIndexWords = blockIndex.words;
    const { keySize, iterations } = cfg;
    while (derivedKeyWords.length < keySize) {
      const block = hmac.update(salt).finalize(blockIndex);
      hmac.reset();
      const blockWords = block.words;
      const blockWordsLength = blockWords.length;
      let intermediate = block;
      for (let i3 = 1; i3 < iterations; i3 += 1) {
        intermediate = hmac.finalize(intermediate);
        hmac.reset();
        const intermediateWords = intermediate.words;
        for (let j = 0; j < blockWordsLength; j += 1) {
          blockWords[j] ^= intermediateWords[j];
        }
      }
      derivedKey.concat(block);
      blockIndexWords[0] += 1;
    }
    derivedKey.sigBytes = keySize * 4;
    return derivedKey;
  }
};
var PBKDF2 = (password, salt, cfg) => PBKDF2Algo.create(cfg).compute(password, salt);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/aes.js
var _SBOX = [];
var INV_SBOX = [];
var _SUB_MIX_0 = [];
var _SUB_MIX_1 = [];
var _SUB_MIX_2 = [];
var _SUB_MIX_3 = [];
var INV_SUB_MIX_0 = [];
var INV_SUB_MIX_1 = [];
var INV_SUB_MIX_2 = [];
var INV_SUB_MIX_3 = [];
var d = [];
for (let i3 = 0; i3 < 256; i3 += 1) {
  if (i3 < 128) {
    d[i3] = i3 << 1;
  } else {
    d[i3] = i3 << 1 ^ 283;
  }
}
var x = 0;
var xi = 0;
for (let i3 = 0; i3 < 256; i3 += 1) {
  let sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
  sx = sx >>> 8 ^ sx & 255 ^ 99;
  _SBOX[x] = sx;
  INV_SBOX[sx] = x;
  const x2 = d[x];
  const x4 = d[x2];
  const x8 = d[x4];
  let t = d[sx] * 257 ^ sx * 16843008;
  _SUB_MIX_0[x] = t << 24 | t >>> 8;
  _SUB_MIX_1[x] = t << 16 | t >>> 16;
  _SUB_MIX_2[x] = t << 8 | t >>> 24;
  _SUB_MIX_3[x] = t;
  t = x8 * 16843009 ^ x4 * 65537 ^ x2 * 257 ^ x * 16843008;
  INV_SUB_MIX_0[sx] = t << 24 | t >>> 8;
  INV_SUB_MIX_1[sx] = t << 16 | t >>> 16;
  INV_SUB_MIX_2[sx] = t << 8 | t >>> 24;
  INV_SUB_MIX_3[sx] = t;
  if (!x) {
    xi = 1;
    x = xi;
  } else {
    x = x2 ^ d[d[d[x8 ^ x2]]];
    xi ^= d[d[xi]];
  }
}
var RCON = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
var AESAlgo = class extends BlockCipher {
  _doReset() {
    let t;
    if (this._nRounds && this._keyPriorReset === this._key) {
      return;
    }
    this._keyPriorReset = this._key;
    const key2 = this._keyPriorReset;
    const keyWords = key2.words;
    const keySize = key2.sigBytes / 4;
    this._nRounds = keySize + 6;
    const nRounds = this._nRounds;
    const ksRows = (nRounds + 1) * 4;
    this._keySchedule = [];
    const keySchedule = this._keySchedule;
    for (let ksRow = 0; ksRow < ksRows; ksRow += 1) {
      if (ksRow < keySize) {
        keySchedule[ksRow] = keyWords[ksRow];
      } else {
        t = keySchedule[ksRow - 1];
        if (!(ksRow % keySize)) {
          t = t << 8 | t >>> 24;
          t = _SBOX[t >>> 24] << 24 | _SBOX[t >>> 16 & 255] << 16 | _SBOX[t >>> 8 & 255] << 8 | _SBOX[t & 255];
          t ^= RCON[ksRow / keySize | 0] << 24;
        } else if (keySize > 6 && ksRow % keySize === 4) {
          t = _SBOX[t >>> 24] << 24 | _SBOX[t >>> 16 & 255] << 16 | _SBOX[t >>> 8 & 255] << 8 | _SBOX[t & 255];
        }
        keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
      }
    }
    this._invKeySchedule = [];
    const invKeySchedule = this._invKeySchedule;
    for (let invKsRow = 0; invKsRow < ksRows; invKsRow += 1) {
      const ksRow = ksRows - invKsRow;
      if (invKsRow % 4) {
        t = keySchedule[ksRow];
      } else {
        t = keySchedule[ksRow - 4];
      }
      if (invKsRow < 4 || ksRow <= 4) {
        invKeySchedule[invKsRow] = t;
      } else {
        invKeySchedule[invKsRow] = INV_SUB_MIX_0[_SBOX[t >>> 24]] ^ INV_SUB_MIX_1[_SBOX[t >>> 16 & 255]] ^ INV_SUB_MIX_2[_SBOX[t >>> 8 & 255]] ^ INV_SUB_MIX_3[_SBOX[t & 255]];
      }
    }
  }
  encryptBlock(M, offset) {
    this._doCryptBlock(
      M,
      offset,
      this._keySchedule,
      _SUB_MIX_0,
      _SUB_MIX_1,
      _SUB_MIX_2,
      _SUB_MIX_3,
      _SBOX
    );
  }
  decryptBlock(M, offset) {
    const _M = M;
    let t = _M[offset + 1];
    _M[offset + 1] = _M[offset + 3];
    _M[offset + 3] = t;
    this._doCryptBlock(
      _M,
      offset,
      this._invKeySchedule,
      INV_SUB_MIX_0,
      INV_SUB_MIX_1,
      INV_SUB_MIX_2,
      INV_SUB_MIX_3,
      INV_SBOX
    );
    t = _M[offset + 1];
    _M[offset + 1] = _M[offset + 3];
    _M[offset + 3] = t;
  }
  _doCryptBlock(M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
    const _M = M;
    const nRounds = this._nRounds;
    let s0 = _M[offset] ^ keySchedule[0];
    let s1 = _M[offset + 1] ^ keySchedule[1];
    let s2 = _M[offset + 2] ^ keySchedule[2];
    let s3 = _M[offset + 3] ^ keySchedule[3];
    let ksRow = 4;
    for (let round = 1; round < nRounds; round += 1) {
      const t02 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[s1 >>> 16 & 255] ^ SUB_MIX_2[s2 >>> 8 & 255] ^ SUB_MIX_3[s3 & 255] ^ keySchedule[ksRow];
      ksRow += 1;
      const t12 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[s2 >>> 16 & 255] ^ SUB_MIX_2[s3 >>> 8 & 255] ^ SUB_MIX_3[s0 & 255] ^ keySchedule[ksRow];
      ksRow += 1;
      const t22 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[s3 >>> 16 & 255] ^ SUB_MIX_2[s0 >>> 8 & 255] ^ SUB_MIX_3[s1 & 255] ^ keySchedule[ksRow];
      ksRow += 1;
      const t32 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[s0 >>> 16 & 255] ^ SUB_MIX_2[s1 >>> 8 & 255] ^ SUB_MIX_3[s2 & 255] ^ keySchedule[ksRow];
      ksRow += 1;
      s0 = t02;
      s1 = t12;
      s2 = t22;
      s3 = t32;
    }
    const t0 = (SBOX[s0 >>> 24] << 24 | SBOX[s1 >>> 16 & 255] << 16 | SBOX[s2 >>> 8 & 255] << 8 | SBOX[s3 & 255]) ^ keySchedule[ksRow];
    ksRow += 1;
    const t1 = (SBOX[s1 >>> 24] << 24 | SBOX[s2 >>> 16 & 255] << 16 | SBOX[s3 >>> 8 & 255] << 8 | SBOX[s0 & 255]) ^ keySchedule[ksRow];
    ksRow += 1;
    const t2 = (SBOX[s2 >>> 24] << 24 | SBOX[s3 >>> 16 & 255] << 16 | SBOX[s0 >>> 8 & 255] << 8 | SBOX[s1 & 255]) ^ keySchedule[ksRow];
    ksRow += 1;
    const t3 = (SBOX[s3 >>> 24] << 24 | SBOX[s0 >>> 16 & 255] << 16 | SBOX[s1 >>> 8 & 255] << 8 | SBOX[s2 & 255]) ^ keySchedule[ksRow];
    ksRow += 1;
    _M[offset] = t0;
    _M[offset + 1] = t1;
    _M[offset + 2] = t2;
    _M[offset + 3] = t3;
  }
};
AESAlgo.keySize = 256 / 32;
var AES = BlockCipher._createHelper(AESAlgo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/tripledes.js
var PC1 = [
  57,
  49,
  41,
  33,
  25,
  17,
  9,
  1,
  58,
  50,
  42,
  34,
  26,
  18,
  10,
  2,
  59,
  51,
  43,
  35,
  27,
  19,
  11,
  3,
  60,
  52,
  44,
  36,
  63,
  55,
  47,
  39,
  31,
  23,
  15,
  7,
  62,
  54,
  46,
  38,
  30,
  22,
  14,
  6,
  61,
  53,
  45,
  37,
  29,
  21,
  13,
  5,
  28,
  20,
  12,
  4
];
var PC2 = [
  14,
  17,
  11,
  24,
  1,
  5,
  3,
  28,
  15,
  6,
  21,
  10,
  23,
  19,
  12,
  4,
  26,
  8,
  16,
  7,
  27,
  20,
  13,
  2,
  41,
  52,
  31,
  37,
  47,
  55,
  30,
  40,
  51,
  45,
  33,
  48,
  44,
  49,
  39,
  56,
  34,
  53,
  46,
  42,
  50,
  36,
  29,
  32
];
var BIT_SHIFTS = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];
var SBOX_P = [
  {
    0: 8421888,
    268435456: 32768,
    536870912: 8421378,
    805306368: 2,
    1073741824: 512,
    1342177280: 8421890,
    1610612736: 8389122,
    1879048192: 8388608,
    2147483648: 514,
    2415919104: 8389120,
    2684354560: 33280,
    2952790016: 8421376,
    3221225472: 32770,
    3489660928: 8388610,
    3758096384: 0,
    4026531840: 33282,
    134217728: 0,
    402653184: 8421890,
    671088640: 33282,
    939524096: 32768,
    1207959552: 8421888,
    1476395008: 512,
    1744830464: 8421378,
    2013265920: 2,
    2281701376: 8389120,
    2550136832: 33280,
    2818572288: 8421376,
    3087007744: 8389122,
    3355443200: 8388610,
    3623878656: 32770,
    3892314112: 514,
    4160749568: 8388608,
    1: 32768,
    268435457: 2,
    536870913: 8421888,
    805306369: 8388608,
    1073741825: 8421378,
    1342177281: 33280,
    1610612737: 512,
    1879048193: 8389122,
    2147483649: 8421890,
    2415919105: 8421376,
    2684354561: 8388610,
    2952790017: 33282,
    3221225473: 514,
    3489660929: 8389120,
    3758096385: 32770,
    4026531841: 0,
    134217729: 8421890,
    402653185: 8421376,
    671088641: 8388608,
    939524097: 512,
    1207959553: 32768,
    1476395009: 8388610,
    1744830465: 2,
    2013265921: 33282,
    2281701377: 32770,
    2550136833: 8389122,
    2818572289: 514,
    3087007745: 8421888,
    3355443201: 8389120,
    3623878657: 0,
    3892314113: 33280,
    4160749569: 8421378
  },
  {
    0: 1074282512,
    16777216: 16384,
    33554432: 524288,
    50331648: 1074266128,
    67108864: 1073741840,
    83886080: 1074282496,
    100663296: 1073758208,
    117440512: 16,
    134217728: 540672,
    150994944: 1073758224,
    167772160: 1073741824,
    184549376: 540688,
    201326592: 524304,
    218103808: 0,
    234881024: 16400,
    251658240: 1074266112,
    8388608: 1073758208,
    25165824: 540688,
    41943040: 16,
    58720256: 1073758224,
    75497472: 1074282512,
    92274688: 1073741824,
    109051904: 524288,
    125829120: 1074266128,
    142606336: 524304,
    159383552: 0,
    176160768: 16384,
    192937984: 1074266112,
    209715200: 1073741840,
    226492416: 540672,
    243269632: 1074282496,
    260046848: 16400,
    268435456: 0,
    285212672: 1074266128,
    301989888: 1073758224,
    318767104: 1074282496,
    335544320: 1074266112,
    352321536: 16,
    369098752: 540688,
    385875968: 16384,
    402653184: 16400,
    419430400: 524288,
    436207616: 524304,
    452984832: 1073741840,
    469762048: 540672,
    486539264: 1073758208,
    503316480: 1073741824,
    520093696: 1074282512,
    276824064: 540688,
    293601280: 524288,
    310378496: 1074266112,
    327155712: 16384,
    343932928: 1073758208,
    360710144: 1074282512,
    377487360: 16,
    394264576: 1073741824,
    411041792: 1074282496,
    427819008: 1073741840,
    444596224: 1073758224,
    461373440: 524304,
    478150656: 0,
    494927872: 16400,
    511705088: 1074266128,
    528482304: 540672
  },
  {
    0: 260,
    1048576: 0,
    2097152: 67109120,
    3145728: 65796,
    4194304: 65540,
    5242880: 67108868,
    6291456: 67174660,
    7340032: 67174400,
    8388608: 67108864,
    9437184: 67174656,
    10485760: 65792,
    11534336: 67174404,
    12582912: 67109124,
    13631488: 65536,
    14680064: 4,
    15728640: 256,
    524288: 67174656,
    1572864: 67174404,
    2621440: 0,
    3670016: 67109120,
    4718592: 67108868,
    5767168: 65536,
    6815744: 65540,
    7864320: 260,
    8912896: 4,
    9961472: 256,
    11010048: 67174400,
    12058624: 65796,
    13107200: 65792,
    14155776: 67109124,
    15204352: 67174660,
    16252928: 67108864,
    16777216: 67174656,
    17825792: 65540,
    18874368: 65536,
    19922944: 67109120,
    20971520: 256,
    22020096: 67174660,
    23068672: 67108868,
    24117248: 0,
    25165824: 67109124,
    26214400: 67108864,
    27262976: 4,
    28311552: 65792,
    29360128: 67174400,
    30408704: 260,
    31457280: 65796,
    32505856: 67174404,
    17301504: 67108864,
    18350080: 260,
    19398656: 67174656,
    20447232: 0,
    21495808: 65540,
    22544384: 67109120,
    23592960: 256,
    24641536: 67174404,
    25690112: 65536,
    26738688: 67174660,
    27787264: 65796,
    28835840: 67108868,
    29884416: 67109124,
    30932992: 67174400,
    31981568: 4,
    33030144: 65792
  },
  {
    0: 2151682048,
    65536: 2147487808,
    131072: 4198464,
    196608: 2151677952,
    262144: 0,
    327680: 4198400,
    393216: 2147483712,
    458752: 4194368,
    524288: 2147483648,
    589824: 4194304,
    655360: 64,
    720896: 2147487744,
    786432: 2151678016,
    851968: 4160,
    917504: 4096,
    983040: 2151682112,
    32768: 2147487808,
    98304: 64,
    163840: 2151678016,
    229376: 2147487744,
    294912: 4198400,
    360448: 2151682112,
    425984: 0,
    491520: 2151677952,
    557056: 4096,
    622592: 2151682048,
    688128: 4194304,
    753664: 4160,
    819200: 2147483648,
    884736: 4194368,
    950272: 4198464,
    1015808: 2147483712,
    1048576: 4194368,
    1114112: 4198400,
    1179648: 2147483712,
    1245184: 0,
    1310720: 4160,
    1376256: 2151678016,
    1441792: 2151682048,
    1507328: 2147487808,
    1572864: 2151682112,
    1638400: 2147483648,
    1703936: 2151677952,
    1769472: 4198464,
    1835008: 2147487744,
    1900544: 4194304,
    1966080: 64,
    2031616: 4096,
    1081344: 2151677952,
    1146880: 2151682112,
    1212416: 0,
    1277952: 4198400,
    1343488: 4194368,
    1409024: 2147483648,
    1474560: 2147487808,
    1540096: 64,
    1605632: 2147483712,
    1671168: 4096,
    1736704: 2147487744,
    1802240: 2151678016,
    1867776: 4160,
    1933312: 2151682048,
    1998848: 4194304,
    2064384: 4198464
  },
  {
    0: 128,
    4096: 17039360,
    8192: 262144,
    12288: 536870912,
    16384: 537133184,
    20480: 16777344,
    24576: 553648256,
    28672: 262272,
    32768: 16777216,
    36864: 537133056,
    40960: 536871040,
    45056: 553910400,
    49152: 553910272,
    53248: 0,
    57344: 17039488,
    61440: 553648128,
    2048: 17039488,
    6144: 553648256,
    10240: 128,
    14336: 17039360,
    18432: 262144,
    22528: 537133184,
    26624: 553910272,
    30720: 536870912,
    34816: 537133056,
    38912: 0,
    43008: 553910400,
    47104: 16777344,
    51200: 536871040,
    55296: 553648128,
    59392: 16777216,
    63488: 262272,
    65536: 262144,
    69632: 128,
    73728: 536870912,
    77824: 553648256,
    81920: 16777344,
    86016: 553910272,
    90112: 537133184,
    94208: 16777216,
    98304: 553910400,
    102400: 553648128,
    106496: 17039360,
    110592: 537133056,
    114688: 262272,
    118784: 536871040,
    122880: 0,
    126976: 17039488,
    67584: 553648256,
    71680: 16777216,
    75776: 17039360,
    79872: 537133184,
    83968: 536870912,
    88064: 17039488,
    92160: 128,
    96256: 553910272,
    100352: 262272,
    104448: 553910400,
    108544: 0,
    112640: 553648128,
    116736: 16777344,
    120832: 262144,
    124928: 537133056,
    129024: 536871040
  },
  {
    0: 268435464,
    256: 8192,
    512: 270532608,
    768: 270540808,
    1024: 268443648,
    1280: 2097152,
    1536: 2097160,
    1792: 268435456,
    2048: 0,
    2304: 268443656,
    2560: 2105344,
    2816: 8,
    3072: 270532616,
    3328: 2105352,
    3584: 8200,
    3840: 270540800,
    128: 270532608,
    384: 270540808,
    640: 8,
    896: 2097152,
    1152: 2105352,
    1408: 268435464,
    1664: 268443648,
    1920: 8200,
    2176: 2097160,
    2432: 8192,
    2688: 268443656,
    2944: 270532616,
    3200: 0,
    3456: 270540800,
    3712: 2105344,
    3968: 268435456,
    4096: 268443648,
    4352: 270532616,
    4608: 270540808,
    4864: 8200,
    5120: 2097152,
    5376: 268435456,
    5632: 268435464,
    5888: 2105344,
    6144: 2105352,
    6400: 0,
    6656: 8,
    6912: 270532608,
    7168: 8192,
    7424: 268443656,
    7680: 270540800,
    7936: 2097160,
    4224: 8,
    4480: 2105344,
    4736: 2097152,
    4992: 268435464,
    5248: 268443648,
    5504: 8200,
    5760: 270540808,
    6016: 270532608,
    6272: 270540800,
    6528: 270532616,
    6784: 8192,
    7040: 2105352,
    7296: 2097160,
    7552: 0,
    7808: 268435456,
    8064: 268443656
  },
  {
    0: 1048576,
    16: 33555457,
    32: 1024,
    48: 1049601,
    64: 34604033,
    80: 0,
    96: 1,
    112: 34603009,
    128: 33555456,
    144: 1048577,
    160: 33554433,
    176: 34604032,
    192: 34603008,
    208: 1025,
    224: 1049600,
    240: 33554432,
    8: 34603009,
    24: 0,
    40: 33555457,
    56: 34604032,
    72: 1048576,
    88: 33554433,
    104: 33554432,
    120: 1025,
    136: 1049601,
    152: 33555456,
    168: 34603008,
    184: 1048577,
    200: 1024,
    216: 34604033,
    232: 1,
    248: 1049600,
    256: 33554432,
    272: 1048576,
    288: 33555457,
    304: 34603009,
    320: 1048577,
    336: 33555456,
    352: 34604032,
    368: 1049601,
    384: 1025,
    400: 34604033,
    416: 1049600,
    432: 1,
    448: 0,
    464: 34603008,
    480: 33554433,
    496: 1024,
    264: 1049600,
    280: 33555457,
    296: 34603009,
    312: 1,
    328: 33554432,
    344: 1048576,
    360: 1025,
    376: 34604032,
    392: 33554433,
    408: 34603008,
    424: 0,
    440: 34604033,
    456: 1049601,
    472: 1024,
    488: 33555456,
    504: 1048577
  },
  {
    0: 134219808,
    1: 131072,
    2: 134217728,
    3: 32,
    4: 131104,
    5: 134350880,
    6: 134350848,
    7: 2048,
    8: 134348800,
    9: 134219776,
    10: 133120,
    11: 134348832,
    12: 2080,
    13: 0,
    14: 134217760,
    15: 133152,
    2147483648: 2048,
    2147483649: 134350880,
    2147483650: 134219808,
    2147483651: 134217728,
    2147483652: 134348800,
    2147483653: 133120,
    2147483654: 133152,
    2147483655: 32,
    2147483656: 134217760,
    2147483657: 2080,
    2147483658: 131104,
    2147483659: 134350848,
    2147483660: 0,
    2147483661: 134348832,
    2147483662: 134219776,
    2147483663: 131072,
    16: 133152,
    17: 134350848,
    18: 32,
    19: 2048,
    20: 134219776,
    21: 134217760,
    22: 134348832,
    23: 131072,
    24: 0,
    25: 131104,
    26: 134348800,
    27: 134219808,
    28: 134350880,
    29: 133120,
    30: 2080,
    31: 134217728,
    2147483664: 131072,
    2147483665: 2048,
    2147483666: 134348832,
    2147483667: 133152,
    2147483668: 32,
    2147483669: 134348800,
    2147483670: 134217728,
    2147483671: 134219808,
    2147483672: 134350880,
    2147483673: 134217760,
    2147483674: 134219776,
    2147483675: 0,
    2147483676: 133120,
    2147483677: 2080,
    2147483678: 131104,
    2147483679: 134350848
  }
];
var SBOX_MASK = [
  4160749569,
  528482304,
  33030144,
  2064384,
  129024,
  8064,
  504,
  2147483679
];
function exchangeLR(offset, mask) {
  const t = (this._lBlock >>> offset ^ this._rBlock) & mask;
  this._rBlock ^= t;
  this._lBlock ^= t << offset;
}
function exchangeRL(offset, mask) {
  const t = (this._rBlock >>> offset ^ this._lBlock) & mask;
  this._lBlock ^= t;
  this._rBlock ^= t << offset;
}
var DESAlgo = class extends BlockCipher {
  constructor(xformMode, key2, cfg) {
    super(xformMode, key2, cfg);
    this.blockSize = 64 / 32;
  }
  _doReset() {
    const key2 = this._key;
    const keyWords = key2.words;
    const keyBits = [];
    for (let i3 = 0; i3 < 56; i3 += 1) {
      const keyBitPos = PC1[i3] - 1;
      keyBits[i3] = keyWords[keyBitPos >>> 5] >>> 31 - keyBitPos % 32 & 1;
    }
    this._subKeys = [];
    const subKeys = this._subKeys;
    for (let nSubKey = 0; nSubKey < 16; nSubKey += 1) {
      subKeys[nSubKey] = [];
      const subKey = subKeys[nSubKey];
      const bitShift = BIT_SHIFTS[nSubKey];
      for (let i3 = 0; i3 < 24; i3 += 1) {
        subKey[i3 / 6 | 0] |= keyBits[(PC2[i3] - 1 + bitShift) % 28] << 31 - i3 % 6;
        subKey[4 + (i3 / 6 | 0)] |= keyBits[28 + (PC2[i3 + 24] - 1 + bitShift) % 28] << 31 - i3 % 6;
      }
      subKey[0] = subKey[0] << 1 | subKey[0] >>> 31;
      for (let i3 = 1; i3 < 7; i3 += 1) {
        subKey[i3] >>>= (i3 - 1) * 4 + 3;
      }
      subKey[7] = subKey[7] << 5 | subKey[7] >>> 27;
    }
    this._invSubKeys = [];
    const invSubKeys = this._invSubKeys;
    for (let i3 = 0; i3 < 16; i3 += 1) {
      invSubKeys[i3] = subKeys[15 - i3];
    }
  }
  encryptBlock(M, offset) {
    this._doCryptBlock(M, offset, this._subKeys);
  }
  decryptBlock(M, offset) {
    this._doCryptBlock(M, offset, this._invSubKeys);
  }
  _doCryptBlock(M, offset, subKeys) {
    const _M = M;
    this._lBlock = M[offset];
    this._rBlock = M[offset + 1];
    exchangeLR.call(this, 4, 252645135);
    exchangeLR.call(this, 16, 65535);
    exchangeRL.call(this, 2, 858993459);
    exchangeRL.call(this, 8, 16711935);
    exchangeLR.call(this, 1, 1431655765);
    for (let round = 0; round < 16; round += 1) {
      const subKey = subKeys[round];
      const lBlock = this._lBlock;
      const rBlock = this._rBlock;
      let f6 = 0;
      for (let i3 = 0; i3 < 8; i3 += 1) {
        f6 |= SBOX_P[i3][((rBlock ^ subKey[i3]) & SBOX_MASK[i3]) >>> 0];
      }
      this._lBlock = rBlock;
      this._rBlock = lBlock ^ f6;
    }
    const t = this._lBlock;
    this._lBlock = this._rBlock;
    this._rBlock = t;
    exchangeLR.call(this, 1, 1431655765);
    exchangeRL.call(this, 8, 16711935);
    exchangeRL.call(this, 2, 858993459);
    exchangeLR.call(this, 16, 65535);
    exchangeLR.call(this, 4, 252645135);
    _M[offset] = this._lBlock;
    _M[offset + 1] = this._rBlock;
  }
};
DESAlgo.keySize = 64 / 32;
DESAlgo.ivSize = 64 / 32;
var DES = BlockCipher._createHelper(DESAlgo);
var TripleDESAlgo = class extends BlockCipher {
  _doReset() {
    const key2 = this._key;
    const keyWords = key2.words;
    if (keyWords.length !== 2 && keyWords.length !== 4 && keyWords.length < 6) {
      throw new Error("Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.");
    }
    const key1 = keyWords.slice(0, 2);
    const key22 = keyWords.length < 4 ? keyWords.slice(0, 2) : keyWords.slice(2, 4);
    const key3 = keyWords.length < 6 ? keyWords.slice(0, 2) : keyWords.slice(4, 6);
    this._des1 = DESAlgo.createEncryptor(WordArray.create(key1));
    this._des2 = DESAlgo.createEncryptor(WordArray.create(key22));
    this._des3 = DESAlgo.createEncryptor(WordArray.create(key3));
  }
  encryptBlock(M, offset) {
    this._des1.encryptBlock(M, offset);
    this._des2.decryptBlock(M, offset);
    this._des3.encryptBlock(M, offset);
  }
  decryptBlock(M, offset) {
    this._des3.decryptBlock(M, offset);
    this._des2.encryptBlock(M, offset);
    this._des1.decryptBlock(M, offset);
  }
};
TripleDESAlgo.keySize = 192 / 32;
TripleDESAlgo.ivSize = 64 / 32;
var TripleDES = BlockCipher._createHelper(TripleDESAlgo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/rabbit.js
var S = [];
var C_ = [];
var G = [];
function nextState() {
  const X = this._X;
  const C = this._C;
  for (let i3 = 0; i3 < 8; i3 += 1) {
    C_[i3] = C[i3];
  }
  C[0] = C[0] + 1295307597 + this._b | 0;
  C[1] = C[1] + 3545052371 + (C[0] >>> 0 < C_[0] >>> 0 ? 1 : 0) | 0;
  C[2] = C[2] + 886263092 + (C[1] >>> 0 < C_[1] >>> 0 ? 1 : 0) | 0;
  C[3] = C[3] + 1295307597 + (C[2] >>> 0 < C_[2] >>> 0 ? 1 : 0) | 0;
  C[4] = C[4] + 3545052371 + (C[3] >>> 0 < C_[3] >>> 0 ? 1 : 0) | 0;
  C[5] = C[5] + 886263092 + (C[4] >>> 0 < C_[4] >>> 0 ? 1 : 0) | 0;
  C[6] = C[6] + 1295307597 + (C[5] >>> 0 < C_[5] >>> 0 ? 1 : 0) | 0;
  C[7] = C[7] + 3545052371 + (C[6] >>> 0 < C_[6] >>> 0 ? 1 : 0) | 0;
  this._b = C[7] >>> 0 < C_[7] >>> 0 ? 1 : 0;
  for (let i3 = 0; i3 < 8; i3 += 1) {
    const gx = X[i3] + C[i3];
    const ga = gx & 65535;
    const gb = gx >>> 16;
    const gh = ((ga * ga >>> 17) + ga * gb >>> 15) + gb * gb;
    const gl = ((gx & 4294901760) * gx | 0) + ((gx & 65535) * gx | 0);
    G[i3] = gh ^ gl;
  }
  X[0] = G[0] + (G[7] << 16 | G[7] >>> 16) + (G[6] << 16 | G[6] >>> 16) | 0;
  X[1] = G[1] + (G[0] << 8 | G[0] >>> 24) + G[7] | 0;
  X[2] = G[2] + (G[1] << 16 | G[1] >>> 16) + (G[0] << 16 | G[0] >>> 16) | 0;
  X[3] = G[3] + (G[2] << 8 | G[2] >>> 24) + G[1] | 0;
  X[4] = G[4] + (G[3] << 16 | G[3] >>> 16) + (G[2] << 16 | G[2] >>> 16) | 0;
  X[5] = G[5] + (G[4] << 8 | G[4] >>> 24) + G[3] | 0;
  X[6] = G[6] + (G[5] << 16 | G[5] >>> 16) + (G[4] << 16 | G[4] >>> 16) | 0;
  X[7] = G[7] + (G[6] << 8 | G[6] >>> 24) + G[5] | 0;
}
var RabbitAlgo = class extends StreamCipher {
  constructor(...args) {
    super(...args);
    this.blockSize = 128 / 32;
    this.ivSize = 64 / 32;
  }
  _doReset() {
    const K3 = this._key.words;
    const { iv } = this.cfg;
    for (let i3 = 0; i3 < 4; i3 += 1) {
      K3[i3] = (K3[i3] << 8 | K3[i3] >>> 24) & 16711935 | (K3[i3] << 24 | K3[i3] >>> 8) & 4278255360;
    }
    this._X = [
      K3[0],
      K3[3] << 16 | K3[2] >>> 16,
      K3[1],
      K3[0] << 16 | K3[3] >>> 16,
      K3[2],
      K3[1] << 16 | K3[0] >>> 16,
      K3[3],
      K3[2] << 16 | K3[1] >>> 16
    ];
    const X = this._X;
    this._C = [
      K3[2] << 16 | K3[2] >>> 16,
      K3[0] & 4294901760 | K3[1] & 65535,
      K3[3] << 16 | K3[3] >>> 16,
      K3[1] & 4294901760 | K3[2] & 65535,
      K3[0] << 16 | K3[0] >>> 16,
      K3[2] & 4294901760 | K3[3] & 65535,
      K3[1] << 16 | K3[1] >>> 16,
      K3[3] & 4294901760 | K3[0] & 65535
    ];
    const C = this._C;
    this._b = 0;
    for (let i3 = 0; i3 < 4; i3 += 1) {
      nextState.call(this);
    }
    for (let i3 = 0; i3 < 8; i3 += 1) {
      C[i3] ^= X[i3 + 4 & 7];
    }
    if (iv) {
      const IV = iv.words;
      const IV_0 = IV[0];
      const IV_1 = IV[1];
      const i0 = (IV_0 << 8 | IV_0 >>> 24) & 16711935 | (IV_0 << 24 | IV_0 >>> 8) & 4278255360;
      const i22 = (IV_1 << 8 | IV_1 >>> 24) & 16711935 | (IV_1 << 24 | IV_1 >>> 8) & 4278255360;
      const i1 = i0 >>> 16 | i22 & 4294901760;
      const i3 = i22 << 16 | i0 & 65535;
      C[0] ^= i0;
      C[1] ^= i1;
      C[2] ^= i22;
      C[3] ^= i3;
      C[4] ^= i0;
      C[5] ^= i1;
      C[6] ^= i22;
      C[7] ^= i3;
      for (let i4 = 0; i4 < 4; i4 += 1) {
        nextState.call(this);
      }
    }
  }
  _doProcessBlock(M, offset) {
    const _M = M;
    const X = this._X;
    nextState.call(this);
    S[0] = X[0] ^ X[5] >>> 16 ^ X[3] << 16;
    S[1] = X[2] ^ X[7] >>> 16 ^ X[5] << 16;
    S[2] = X[4] ^ X[1] >>> 16 ^ X[7] << 16;
    S[3] = X[6] ^ X[3] >>> 16 ^ X[1] << 16;
    for (let i3 = 0; i3 < 4; i3 += 1) {
      S[i3] = (S[i3] << 8 | S[i3] >>> 24) & 16711935 | (S[i3] << 24 | S[i3] >>> 8) & 4278255360;
      _M[offset + i3] ^= S[i3];
    }
  }
};
var Rabbit = StreamCipher._createHelper(RabbitAlgo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/rabbit-legacy.js
var S2 = [];
var C_2 = [];
var G2 = [];
function nextState2() {
  const X = this._X;
  const C = this._C;
  for (let i3 = 0; i3 < 8; i3 += 1) {
    C_2[i3] = C[i3];
  }
  C[0] = C[0] + 1295307597 + this._b | 0;
  C[1] = C[1] + 3545052371 + (C[0] >>> 0 < C_2[0] >>> 0 ? 1 : 0) | 0;
  C[2] = C[2] + 886263092 + (C[1] >>> 0 < C_2[1] >>> 0 ? 1 : 0) | 0;
  C[3] = C[3] + 1295307597 + (C[2] >>> 0 < C_2[2] >>> 0 ? 1 : 0) | 0;
  C[4] = C[4] + 3545052371 + (C[3] >>> 0 < C_2[3] >>> 0 ? 1 : 0) | 0;
  C[5] = C[5] + 886263092 + (C[4] >>> 0 < C_2[4] >>> 0 ? 1 : 0) | 0;
  C[6] = C[6] + 1295307597 + (C[5] >>> 0 < C_2[5] >>> 0 ? 1 : 0) | 0;
  C[7] = C[7] + 3545052371 + (C[6] >>> 0 < C_2[6] >>> 0 ? 1 : 0) | 0;
  this._b = C[7] >>> 0 < C_2[7] >>> 0 ? 1 : 0;
  for (let i3 = 0; i3 < 8; i3 += 1) {
    const gx = X[i3] + C[i3];
    const ga = gx & 65535;
    const gb = gx >>> 16;
    const gh = ((ga * ga >>> 17) + ga * gb >>> 15) + gb * gb;
    const gl = ((gx & 4294901760) * gx | 0) + ((gx & 65535) * gx | 0);
    G2[i3] = gh ^ gl;
  }
  X[0] = G2[0] + (G2[7] << 16 | G2[7] >>> 16) + (G2[6] << 16 | G2[6] >>> 16) | 0;
  X[1] = G2[1] + (G2[0] << 8 | G2[0] >>> 24) + G2[7] | 0;
  X[2] = G2[2] + (G2[1] << 16 | G2[1] >>> 16) + (G2[0] << 16 | G2[0] >>> 16) | 0;
  X[3] = G2[3] + (G2[2] << 8 | G2[2] >>> 24) + G2[1] | 0;
  X[4] = G2[4] + (G2[3] << 16 | G2[3] >>> 16) + (G2[2] << 16 | G2[2] >>> 16) | 0;
  X[5] = G2[5] + (G2[4] << 8 | G2[4] >>> 24) + G2[3] | 0;
  X[6] = G2[6] + (G2[5] << 16 | G2[5] >>> 16) + (G2[4] << 16 | G2[4] >>> 16) | 0;
  X[7] = G2[7] + (G2[6] << 8 | G2[6] >>> 24) + G2[5] | 0;
}
var RabbitLegacyAlgo = class extends StreamCipher {
  constructor(...args) {
    super(...args);
    this.blockSize = 128 / 32;
    this.ivSize = 64 / 32;
  }
  _doReset() {
    const K3 = this._key.words;
    const { iv } = this.cfg;
    this._X = [
      K3[0],
      K3[3] << 16 | K3[2] >>> 16,
      K3[1],
      K3[0] << 16 | K3[3] >>> 16,
      K3[2],
      K3[1] << 16 | K3[0] >>> 16,
      K3[3],
      K3[2] << 16 | K3[1] >>> 16
    ];
    const X = this._X;
    this._C = [
      K3[2] << 16 | K3[2] >>> 16,
      K3[0] & 4294901760 | K3[1] & 65535,
      K3[3] << 16 | K3[3] >>> 16,
      K3[1] & 4294901760 | K3[2] & 65535,
      K3[0] << 16 | K3[0] >>> 16,
      K3[2] & 4294901760 | K3[3] & 65535,
      K3[1] << 16 | K3[1] >>> 16,
      K3[3] & 4294901760 | K3[0] & 65535
    ];
    const C = this._C;
    this._b = 0;
    for (let i3 = 0; i3 < 4; i3 += 1) {
      nextState2.call(this);
    }
    for (let i3 = 0; i3 < 8; i3 += 1) {
      C[i3] ^= X[i3 + 4 & 7];
    }
    if (iv) {
      const IV = iv.words;
      const IV_0 = IV[0];
      const IV_1 = IV[1];
      const i0 = (IV_0 << 8 | IV_0 >>> 24) & 16711935 | (IV_0 << 24 | IV_0 >>> 8) & 4278255360;
      const i22 = (IV_1 << 8 | IV_1 >>> 24) & 16711935 | (IV_1 << 24 | IV_1 >>> 8) & 4278255360;
      const i1 = i0 >>> 16 | i22 & 4294901760;
      const i3 = i22 << 16 | i0 & 65535;
      C[0] ^= i0;
      C[1] ^= i1;
      C[2] ^= i22;
      C[3] ^= i3;
      C[4] ^= i0;
      C[5] ^= i1;
      C[6] ^= i22;
      C[7] ^= i3;
      for (let i4 = 0; i4 < 4; i4 += 1) {
        nextState2.call(this);
      }
    }
  }
  _doProcessBlock(M, offset) {
    const _M = M;
    const X = this._X;
    nextState2.call(this);
    S2[0] = X[0] ^ X[5] >>> 16 ^ X[3] << 16;
    S2[1] = X[2] ^ X[7] >>> 16 ^ X[5] << 16;
    S2[2] = X[4] ^ X[1] >>> 16 ^ X[7] << 16;
    S2[3] = X[6] ^ X[3] >>> 16 ^ X[1] << 16;
    for (let i3 = 0; i3 < 4; i3 += 1) {
      S2[i3] = (S2[i3] << 8 | S2[i3] >>> 24) & 16711935 | (S2[i3] << 24 | S2[i3] >>> 8) & 4278255360;
      _M[offset + i3] ^= S2[i3];
    }
  }
};
var RabbitLegacy = StreamCipher._createHelper(RabbitLegacyAlgo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/rc4.js
function generateKeystreamWord() {
  const S3 = this._S;
  let i3 = this._i;
  let j = this._j;
  let keystreamWord = 0;
  for (let n2 = 0; n2 < 4; n2 += 1) {
    i3 = (i3 + 1) % 256;
    j = (j + S3[i3]) % 256;
    const t = S3[i3];
    S3[i3] = S3[j];
    S3[j] = t;
    keystreamWord |= S3[(S3[i3] + S3[j]) % 256] << 24 - n2 * 8;
  }
  this._i = i3;
  this._j = j;
  return keystreamWord;
}
var RC4Algo = class extends StreamCipher {
  _doReset() {
    const key2 = this._key;
    const keyWords = key2.words;
    const keySigBytes = key2.sigBytes;
    this._S = [];
    const S3 = this._S;
    for (let i3 = 0; i3 < 256; i3 += 1) {
      S3[i3] = i3;
    }
    for (let i3 = 0, j = 0; i3 < 256; i3 += 1) {
      const keyByteIndex = i3 % keySigBytes;
      const keyByte = keyWords[keyByteIndex >>> 2] >>> 24 - keyByteIndex % 4 * 8 & 255;
      j = (j + S3[i3] + keyByte) % 256;
      const t = S3[i3];
      S3[i3] = S3[j];
      S3[j] = t;
    }
    this._j = 0;
    this._i = this._j;
  }
  _doProcessBlock(M, offset) {
    const _M = M;
    _M[offset] ^= generateKeystreamWord.call(this);
  }
};
RC4Algo.keySize = 256 / 32;
RC4Algo.ivSize = 0;
var RC4 = StreamCipher._createHelper(RC4Algo);
var RC4DropAlgo = class extends RC4Algo {
  constructor(...args) {
    super(...args);
    Object.assign(this.cfg, { drop: 192 });
  }
  _doReset() {
    super._doReset.call(this);
    for (let i3 = this.cfg.drop; i3 > 0; i3 -= 1) {
      generateKeystreamWord.call(this);
    }
  }
};
var RC4Drop = StreamCipher._createHelper(RC4DropAlgo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/blowfish.js
var N = 16;
var ORIG_P = [
  608135816,
  2242054355,
  320440878,
  57701188,
  2752067618,
  698298832,
  137296536,
  3964562569,
  1160258022,
  953160567,
  3193202383,
  887688300,
  3232508343,
  3380367581,
  1065670069,
  3041331479,
  2450970073,
  2306472731
];
var ORIG_S = [
  [
    3509652390,
    2564797868,
    805139163,
    3491422135,
    3101798381,
    1780907670,
    3128725573,
    4046225305,
    614570311,
    3012652279,
    134345442,
    2240740374,
    1667834072,
    1901547113,
    2757295779,
    4103290238,
    227898511,
    1921955416,
    1904987480,
    2182433518,
    2069144605,
    3260701109,
    2620446009,
    720527379,
    3318853667,
    677414384,
    3393288472,
    3101374703,
    2390351024,
    1614419982,
    1822297739,
    2954791486,
    3608508353,
    3174124327,
    2024746970,
    1432378464,
    3864339955,
    2857741204,
    1464375394,
    1676153920,
    1439316330,
    715854006,
    3033291828,
    289532110,
    2706671279,
    2087905683,
    3018724369,
    1668267050,
    732546397,
    1947742710,
    3462151702,
    2609353502,
    2950085171,
    1814351708,
    2050118529,
    680887927,
    999245976,
    1800124847,
    3300911131,
    1713906067,
    1641548236,
    4213287313,
    1216130144,
    1575780402,
    4018429277,
    3917837745,
    3693486850,
    3949271944,
    596196993,
    3549867205,
    258830323,
    2213823033,
    772490370,
    2760122372,
    1774776394,
    2652871518,
    566650946,
    4142492826,
    1728879713,
    2882767088,
    1783734482,
    3629395816,
    2517608232,
    2874225571,
    1861159788,
    326777828,
    3124490320,
    2130389656,
    2716951837,
    967770486,
    1724537150,
    2185432712,
    2364442137,
    1164943284,
    2105845187,
    998989502,
    3765401048,
    2244026483,
    1075463327,
    1455516326,
    1322494562,
    910128902,
    469688178,
    1117454909,
    936433444,
    3490320968,
    3675253459,
    1240580251,
    122909385,
    2157517691,
    634681816,
    4142456567,
    3825094682,
    3061402683,
    2540495037,
    79693498,
    3249098678,
    1084186820,
    1583128258,
    426386531,
    1761308591,
    1047286709,
    322548459,
    995290223,
    1845252383,
    2603652396,
    3431023940,
    2942221577,
    3202600964,
    3727903485,
    1712269319,
    422464435,
    3234572375,
    1170764815,
    3523960633,
    3117677531,
    1434042557,
    442511882,
    3600875718,
    1076654713,
    1738483198,
    4213154764,
    2393238008,
    3677496056,
    1014306527,
    4251020053,
    793779912,
    2902807211,
    842905082,
    4246964064,
    1395751752,
    1040244610,
    2656851899,
    3396308128,
    445077038,
    3742853595,
    3577915638,
    679411651,
    2892444358,
    2354009459,
    1767581616,
    3150600392,
    3791627101,
    3102740896,
    284835224,
    4246832056,
    1258075500,
    768725851,
    2589189241,
    3069724005,
    3532540348,
    1274779536,
    3789419226,
    2764799539,
    1660621633,
    3471099624,
    4011903706,
    913787905,
    3497959166,
    737222580,
    2514213453,
    2928710040,
    3937242737,
    1804850592,
    3499020752,
    2949064160,
    2386320175,
    2390070455,
    2415321851,
    4061277028,
    2290661394,
    2416832540,
    1336762016,
    1754252060,
    3520065937,
    3014181293,
    791618072,
    3188594551,
    3933548030,
    2332172193,
    3852520463,
    3043980520,
    413987798,
    3465142937,
    3030929376,
    4245938359,
    2093235073,
    3534596313,
    375366246,
    2157278981,
    2479649556,
    555357303,
    3870105701,
    2008414854,
    3344188149,
    4221384143,
    3956125452,
    2067696032,
    3594591187,
    2921233993,
    2428461,
    544322398,
    577241275,
    1471733935,
    610547355,
    4027169054,
    1432588573,
    1507829418,
    2025931657,
    3646575487,
    545086370,
    48609733,
    2200306550,
    1653985193,
    298326376,
    1316178497,
    3007786442,
    2064951626,
    458293330,
    2589141269,
    3591329599,
    3164325604,
    727753846,
    2179363840,
    146436021,
    1461446943,
    4069977195,
    705550613,
    3059967265,
    3887724982,
    4281599278,
    3313849956,
    1404054877,
    2845806497,
    146425753,
    1854211946
  ],
  [
    1266315497,
    3048417604,
    3681880366,
    3289982499,
    290971e4,
    1235738493,
    2632868024,
    2414719590,
    3970600049,
    1771706367,
    1449415276,
    3266420449,
    422970021,
    1963543593,
    2690192192,
    3826793022,
    1062508698,
    1531092325,
    1804592342,
    2583117782,
    2714934279,
    4024971509,
    1294809318,
    4028980673,
    1289560198,
    2221992742,
    1669523910,
    35572830,
    157838143,
    1052438473,
    1016535060,
    1802137761,
    1753167236,
    1386275462,
    3080475397,
    2857371447,
    1040679964,
    2145300060,
    2390574316,
    1461121720,
    2956646967,
    4031777805,
    4028374788,
    33600511,
    2920084762,
    1018524850,
    629373528,
    3691585981,
    3515945977,
    2091462646,
    2486323059,
    586499841,
    988145025,
    935516892,
    3367335476,
    2599673255,
    2839830854,
    265290510,
    3972581182,
    2759138881,
    3795373465,
    1005194799,
    847297441,
    406762289,
    1314163512,
    1332590856,
    1866599683,
    4127851711,
    750260880,
    613907577,
    1450815602,
    3165620655,
    3734664991,
    3650291728,
    3012275730,
    3704569646,
    1427272223,
    778793252,
    1343938022,
    2676280711,
    2052605720,
    1946737175,
    3164576444,
    3914038668,
    3967478842,
    3682934266,
    1661551462,
    3294938066,
    4011595847,
    840292616,
    3712170807,
    616741398,
    312560963,
    711312465,
    1351876610,
    322626781,
    1910503582,
    271666773,
    2175563734,
    1594956187,
    70604529,
    3617834859,
    1007753275,
    1495573769,
    4069517037,
    2549218298,
    2663038764,
    504708206,
    2263041392,
    3941167025,
    2249088522,
    1514023603,
    1998579484,
    1312622330,
    694541497,
    2582060303,
    2151582166,
    1382467621,
    776784248,
    2618340202,
    3323268794,
    2497899128,
    2784771155,
    503983604,
    4076293799,
    907881277,
    423175695,
    432175456,
    1378068232,
    4145222326,
    3954048622,
    3938656102,
    3820766613,
    2793130115,
    2977904593,
    26017576,
    3274890735,
    3194772133,
    1700274565,
    1756076034,
    4006520079,
    3677328699,
    720338349,
    1533947780,
    354530856,
    688349552,
    3973924725,
    1637815568,
    332179504,
    3949051286,
    53804574,
    2852348879,
    3044236432,
    1282449977,
    3583942155,
    3416972820,
    4006381244,
    1617046695,
    2628476075,
    3002303598,
    1686838959,
    431878346,
    2686675385,
    1700445008,
    1080580658,
    1009431731,
    832498133,
    3223435511,
    2605976345,
    2271191193,
    2516031870,
    1648197032,
    4164389018,
    2548247927,
    300782431,
    375919233,
    238389289,
    3353747414,
    2531188641,
    2019080857,
    1475708069,
    455242339,
    2609103871,
    448939670,
    3451063019,
    1395535956,
    2413381860,
    1841049896,
    1491858159,
    885456874,
    4264095073,
    4001119347,
    1565136089,
    3898914787,
    1108368660,
    540939232,
    1173283510,
    2745871338,
    3681308437,
    4207628240,
    3343053890,
    4016749493,
    1699691293,
    1103962373,
    3625875870,
    2256883143,
    3830138730,
    1031889488,
    3479347698,
    1535977030,
    4236805024,
    3251091107,
    2132092099,
    1774941330,
    1199868427,
    1452454533,
    157007616,
    2904115357,
    342012276,
    595725824,
    1480756522,
    206960106,
    497939518,
    591360097,
    863170706,
    2375253569,
    3596610801,
    1814182875,
    2094937945,
    3421402208,
    1082520231,
    3463918190,
    2785509508,
    435703966,
    3908032597,
    1641649973,
    2842273706,
    3305899714,
    1510255612,
    2148256476,
    2655287854,
    3276092548,
    4258621189,
    236887753,
    3681803219,
    274041037,
    1734335097,
    3815195456,
    3317970021,
    1899903192,
    1026095262,
    4050517792,
    356393447,
    2410691914,
    3873677099,
    3682840055
  ],
  [
    3913112168,
    2491498743,
    4132185628,
    2489919796,
    1091903735,
    1979897079,
    3170134830,
    3567386728,
    3557303409,
    857797738,
    1136121015,
    1342202287,
    507115054,
    2535736646,
    337727348,
    3213592640,
    1301675037,
    2528481711,
    1895095763,
    1721773893,
    3216771564,
    62756741,
    2142006736,
    835421444,
    2531993523,
    1442658625,
    3659876326,
    2882144922,
    676362277,
    1392781812,
    170690266,
    3921047035,
    1759253602,
    3611846912,
    1745797284,
    664899054,
    1329594018,
    3901205900,
    3045908486,
    2062866102,
    2865634940,
    3543621612,
    3464012697,
    1080764994,
    553557557,
    3656615353,
    3996768171,
    991055499,
    499776247,
    1265440854,
    648242737,
    3940784050,
    980351604,
    3713745714,
    1749149687,
    3396870395,
    4211799374,
    3640570775,
    1161844396,
    3125318951,
    1431517754,
    545492359,
    4268468663,
    3499529547,
    1437099964,
    2702547544,
    3433638243,
    2581715763,
    2787789398,
    1060185593,
    1593081372,
    2418618748,
    4260947970,
    69676912,
    2159744348,
    86519011,
    2512459080,
    3838209314,
    1220612927,
    3339683548,
    133810670,
    1090789135,
    1078426020,
    1569222167,
    845107691,
    3583754449,
    4072456591,
    1091646820,
    628848692,
    1613405280,
    3757631651,
    526609435,
    236106946,
    48312990,
    2942717905,
    3402727701,
    1797494240,
    859738849,
    992217954,
    4005476642,
    2243076622,
    3870952857,
    3732016268,
    765654824,
    3490871365,
    2511836413,
    1685915746,
    3888969200,
    1414112111,
    2273134842,
    3281911079,
    4080962846,
    172450625,
    2569994100,
    980381355,
    4109958455,
    2819808352,
    2716589560,
    2568741196,
    3681446669,
    3329971472,
    1835478071,
    660984891,
    3704678404,
    4045999559,
    3422617507,
    3040415634,
    1762651403,
    1719377915,
    3470491036,
    2693910283,
    3642056355,
    3138596744,
    1364962596,
    2073328063,
    1983633131,
    926494387,
    3423689081,
    2150032023,
    4096667949,
    1749200295,
    3328846651,
    309677260,
    2016342300,
    1779581495,
    3079819751,
    111262694,
    1274766160,
    443224088,
    298511866,
    1025883608,
    3806446537,
    1145181785,
    168956806,
    3641502830,
    3584813610,
    1689216846,
    3666258015,
    3200248200,
    1692713982,
    2646376535,
    4042768518,
    1618508792,
    1610833997,
    3523052358,
    4130873264,
    2001055236,
    3610705100,
    2202168115,
    4028541809,
    2961195399,
    1006657119,
    2006996926,
    3186142756,
    1430667929,
    3210227297,
    1314452623,
    4074634658,
    4101304120,
    2273951170,
    1399257539,
    3367210612,
    3027628629,
    1190975929,
    2062231137,
    2333990788,
    2221543033,
    2438960610,
    1181637006,
    548689776,
    2362791313,
    3372408396,
    3104550113,
    3145860560,
    296247880,
    1970579870,
    3078560182,
    3769228297,
    1714227617,
    3291629107,
    3898220290,
    166772364,
    1251581989,
    493813264,
    448347421,
    195405023,
    2709975567,
    677966185,
    3703036547,
    1463355134,
    2715995803,
    1338867538,
    1343315457,
    2802222074,
    2684532164,
    233230375,
    2599980071,
    2000651841,
    3277868038,
    1638401717,
    4028070440,
    3237316320,
    6314154,
    819756386,
    300326615,
    590932579,
    1405279636,
    3267499572,
    3150704214,
    2428286686,
    3959192993,
    3461946742,
    1862657033,
    1266418056,
    963775037,
    2089974820,
    2263052895,
    1917689273,
    448879540,
    3550394620,
    3981727096,
    150775221,
    3627908307,
    1303187396,
    508620638,
    2975983352,
    2726630617,
    1817252668,
    1876281319,
    1457606340,
    908771278,
    3720792119,
    3617206836,
    2455994898,
    1729034894,
    1080033504
  ],
  [
    976866871,
    3556439503,
    2881648439,
    1522871579,
    1555064734,
    1336096578,
    3548522304,
    2579274686,
    3574697629,
    3205460757,
    3593280638,
    3338716283,
    3079412587,
    564236357,
    2993598910,
    1781952180,
    1464380207,
    3163844217,
    3332601554,
    1699332808,
    1393555694,
    1183702653,
    3581086237,
    1288719814,
    691649499,
    2847557200,
    2895455976,
    3193889540,
    2717570544,
    1781354906,
    1676643554,
    2592534050,
    3230253752,
    1126444790,
    2770207658,
    2633158820,
    2210423226,
    2615765581,
    2414155088,
    3127139286,
    673620729,
    2805611233,
    1269405062,
    4015350505,
    3341807571,
    4149409754,
    1057255273,
    2012875353,
    2162469141,
    2276492801,
    2601117357,
    993977747,
    3918593370,
    2654263191,
    753973209,
    36408145,
    2530585658,
    25011837,
    3520020182,
    2088578344,
    530523599,
    2918365339,
    1524020338,
    1518925132,
    3760827505,
    3759777254,
    1202760957,
    3985898139,
    3906192525,
    674977740,
    4174734889,
    2031300136,
    2019492241,
    3983892565,
    4153806404,
    3822280332,
    352677332,
    2297720250,
    60907813,
    90501309,
    3286998549,
    1016092578,
    2535922412,
    2839152426,
    457141659,
    509813237,
    4120667899,
    652014361,
    1966332200,
    2975202805,
    55981186,
    2327461051,
    676427537,
    3255491064,
    2882294119,
    3433927263,
    1307055953,
    942726286,
    933058658,
    2468411793,
    3933900994,
    4215176142,
    1361170020,
    2001714738,
    2830558078,
    3274259782,
    1222529897,
    1679025792,
    2729314320,
    3714953764,
    1770335741,
    151462246,
    3013232138,
    1682292957,
    1483529935,
    471910574,
    1539241949,
    458788160,
    3436315007,
    1807016891,
    3718408830,
    978976581,
    1043663428,
    3165965781,
    1927990952,
    4200891579,
    2372276910,
    3208408903,
    3533431907,
    1412390302,
    2931980059,
    4132332400,
    1947078029,
    3881505623,
    4168226417,
    2941484381,
    1077988104,
    1320477388,
    886195818,
    18198404,
    3786409e3,
    2509781533,
    112762804,
    3463356488,
    1866414978,
    891333506,
    18488651,
    661792760,
    1628790961,
    3885187036,
    3141171499,
    876946877,
    2693282273,
    1372485963,
    791857591,
    2686433993,
    3759982718,
    3167212022,
    3472953795,
    2716379847,
    445679433,
    3561995674,
    3504004811,
    3574258232,
    54117162,
    3331405415,
    2381918588,
    3769707343,
    4154350007,
    1140177722,
    4074052095,
    668550556,
    3214352940,
    367459370,
    261225585,
    2610173221,
    4209349473,
    3468074219,
    3265815641,
    314222801,
    3066103646,
    3808782860,
    282218597,
    3406013506,
    3773591054,
    379116347,
    1285071038,
    846784868,
    2669647154,
    3771962079,
    3550491691,
    2305946142,
    453669953,
    1268987020,
    3317592352,
    3279303384,
    3744833421,
    2610507566,
    3859509063,
    266596637,
    3847019092,
    517658769,
    3462560207,
    3443424879,
    370717030,
    4247526661,
    2224018117,
    4143653529,
    4112773975,
    2788324899,
    2477274417,
    1456262402,
    2901442914,
    1517677493,
    1846949527,
    2295493580,
    3734397586,
    2176403920,
    1280348187,
    1908823572,
    3871786941,
    846861322,
    1172426758,
    3287448474,
    3383383037,
    1655181056,
    3139813346,
    901632758,
    1897031941,
    2986607138,
    3066810236,
    3447102507,
    1393639104,
    373351379,
    950779232,
    625454576,
    3124240540,
    4148612726,
    2007998917,
    544563296,
    2244738638,
    2330496472,
    2058025392,
    1291430526,
    424198748,
    50039436,
    29584100,
    3605783033,
    2429876329,
    2791104160,
    1057563949,
    3255363231,
    3075367218,
    3463963227,
    1469046755,
    985887462
  ]
];
var blowfishCtx = {
  pbox: [],
  sbox: []
};
function f(ctx, x2) {
  const a = x2 >> 24 & 255;
  const b = x2 >> 16 & 255;
  const c = x2 >> 8 & 255;
  const d2 = x2 & 255;
  let y = ctx.sbox[0][a] + ctx.sbox[1][b];
  y = y ^ ctx.sbox[2][c];
  y = y + ctx.sbox[3][d2];
  return y;
}
function blowfishEncrypt(ctx, left, right) {
  let Xl = left;
  let Xr = right;
  let temp;
  for (let i3 = 0; i3 < N; ++i3) {
    Xl = Xl ^ ctx.pbox[i3];
    Xr = f(ctx, Xl) ^ Xr;
    temp = Xl;
    Xl = Xr;
    Xr = temp;
  }
  temp = Xl;
  Xl = Xr;
  Xr = temp;
  Xr = Xr ^ ctx.pbox[N];
  Xl = Xl ^ ctx.pbox[N + 1];
  return { left: Xl, right: Xr };
}
function blowfishDecrypt(ctx, left, right) {
  let Xl = left;
  let Xr = right;
  let temp;
  for (let i3 = N + 1; i3 > 1; --i3) {
    Xl = Xl ^ ctx.pbox[i3];
    Xr = f(ctx, Xl) ^ Xr;
    temp = Xl;
    Xl = Xr;
    Xr = temp;
  }
  temp = Xl;
  Xl = Xr;
  Xr = temp;
  Xr = Xr ^ ctx.pbox[1];
  Xl = Xl ^ ctx.pbox[0];
  return { left: Xl, right: Xr };
}
function blowfishInit(ctx, key2, keysize) {
  for (let Row = 0; Row < 4; Row++) {
    ctx.sbox[Row] = [];
    for (let Col = 0; Col < 256; Col++) {
      ctx.sbox[Row][Col] = ORIG_S[Row][Col];
    }
  }
  let keyIndex = 0;
  for (let index = 0; index < N + 2; index++) {
    ctx.pbox[index] = ORIG_P[index] ^ key2[keyIndex];
    keyIndex++;
    if (keyIndex >= keysize) {
      keyIndex = 0;
    }
  }
  let data1 = 0;
  let data2 = 0;
  let res = 0;
  for (let i3 = 0; i3 < N + 2; i3 += 2) {
    res = blowfishEncrypt(ctx, data1, data2);
    data1 = res.left;
    data2 = res.right;
    ctx.pbox[i3] = data1;
    ctx.pbox[i3 + 1] = data2;
  }
  for (let i3 = 0; i3 < 4; i3++) {
    for (let j = 0; j < 256; j += 2) {
      res = blowfishEncrypt(ctx, data1, data2);
      data1 = res.left;
      data2 = res.right;
      ctx.sbox[i3][j] = data1;
      ctx.sbox[i3][j + 1] = data2;
    }
  }
  return true;
}
var BlowfishAlgo = class extends BlockCipher {
  constructor(xformMode, key2, cfg) {
    super(xformMode, key2, cfg);
    this.blockSize = 64 / 32;
  }
  _doReset() {
    if (this._keyPriorReset === this._key) {
      return;
    }
    const key2 = this._keyPriorReset = this._key;
    const keyWords = key2.words;
    const keySize = key2.sigBytes / 4;
    blowfishInit(blowfishCtx, keyWords, keySize);
  }
  encryptBlock(M, offset) {
    const res = blowfishEncrypt(blowfishCtx, M[offset], M[offset + 1]);
    M[offset] = res.left;
    M[offset + 1] = res.right;
  }
  decryptBlock(M, offset) {
    const res = blowfishDecrypt(blowfishCtx, M[offset], M[offset + 1]);
    M[offset] = res.left;
    M[offset + 1] = res.right;
  }
};
BlowfishAlgo.keySize = 128 / 32;
BlowfishAlgo.ivSize = 64 / 32;
var Blowfish = BlockCipher._createHelper(BlowfishAlgo);

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/mode-cfb.js
function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
  const _words = words;
  let keystream;
  const iv = this._iv;
  if (iv) {
    keystream = iv.slice(0);
    this._iv = void 0;
  } else {
    keystream = this._prevBlock;
  }
  cipher.encryptBlock(keystream, 0);
  for (let i3 = 0; i3 < blockSize; i3 += 1) {
    _words[offset + i3] ^= keystream[i3];
  }
}
var CFB = class extends BlockCipherMode {
};
CFB.Encryptor = class extends CFB {
  processBlock(words, offset) {
    const cipher = this._cipher;
    const { blockSize } = cipher;
    generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);
    this._prevBlock = words.slice(offset, offset + blockSize);
  }
};
CFB.Decryptor = class extends CFB {
  processBlock(words, offset) {
    const cipher = this._cipher;
    const { blockSize } = cipher;
    const thisBlock = words.slice(offset, offset + blockSize);
    generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);
    this._prevBlock = thisBlock;
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/mode-ctr.js
var CTR = class extends BlockCipherMode {
};
CTR.Encryptor = class extends CTR {
  processBlock(words, offset) {
    const _words = words;
    const cipher = this._cipher;
    const { blockSize } = cipher;
    const iv = this._iv;
    let counter = this._counter;
    if (iv) {
      this._counter = iv.slice(0);
      counter = this._counter;
      this._iv = void 0;
    }
    const keystream = counter.slice(0);
    cipher.encryptBlock(keystream, 0);
    counter[blockSize - 1] = counter[blockSize - 1] + 1 | 0;
    for (let i3 = 0; i3 < blockSize; i3 += 1) {
      _words[offset + i3] ^= keystream[i3];
    }
  }
};
CTR.Decryptor = CTR.Encryptor;

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/mode-ctr-gladman.js
var incWord = (word) => {
  let _word = word;
  if ((word >> 24 & 255) === 255) {
    let b1 = word >> 16 & 255;
    let b2 = word >> 8 & 255;
    let b3 = word & 255;
    if (b1 === 255) {
      b1 = 0;
      if (b2 === 255) {
        b2 = 0;
        if (b3 === 255) {
          b3 = 0;
        } else {
          b3 += 1;
        }
      } else {
        b2 += 1;
      }
    } else {
      b1 += 1;
    }
    _word = 0;
    _word += b1 << 16;
    _word += b2 << 8;
    _word += b3;
  } else {
    _word += 1 << 24;
  }
  return _word;
};
var incCounter = (counter) => {
  const _counter = counter;
  _counter[0] = incWord(_counter[0]);
  if (_counter[0] === 0) {
    _counter[1] = incWord(_counter[1]);
  }
  return _counter;
};
var CTRGladman = class extends BlockCipherMode {
};
CTRGladman.Encryptor = class extends CTRGladman {
  processBlock(words, offset) {
    const _words = words;
    const cipher = this._cipher;
    const { blockSize } = cipher;
    const iv = this._iv;
    let counter = this._counter;
    if (iv) {
      this._counter = iv.slice(0);
      counter = this._counter;
      this._iv = void 0;
    }
    incCounter(counter);
    const keystream = counter.slice(0);
    cipher.encryptBlock(keystream, 0);
    for (let i3 = 0; i3 < blockSize; i3 += 1) {
      _words[offset + i3] ^= keystream[i3];
    }
  }
};
CTRGladman.Decryptor = CTRGladman.Encryptor;

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/mode-ecb.js
var ECB = class extends BlockCipherMode {
};
ECB.Encryptor = class extends ECB {
  processBlock(words, offset) {
    this._cipher.encryptBlock(words, offset);
  }
};
ECB.Decryptor = class extends ECB {
  processBlock(words, offset) {
    this._cipher.decryptBlock(words, offset);
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/mode-ofb.js
var OFB = class extends BlockCipherMode {
};
OFB.Encryptor = class extends OFB {
  processBlock(words, offset) {
    const _words = words;
    const cipher = this._cipher;
    const { blockSize } = cipher;
    const iv = this._iv;
    let keystream = this._keystream;
    if (iv) {
      this._keystream = iv.slice(0);
      keystream = this._keystream;
      this._iv = void 0;
    }
    cipher.encryptBlock(keystream, 0);
    for (let i3 = 0; i3 < blockSize; i3 += 1) {
      _words[offset + i3] ^= keystream[i3];
    }
  }
};
OFB.Decryptor = OFB.Encryptor;

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/pad-ansix923.js
var AnsiX923 = {
  pad(data, blockSize) {
    const _data = data;
    const dataSigBytes = _data.sigBytes;
    const blockSizeBytes = blockSize * 4;
    const nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;
    const lastBytePos = dataSigBytes + nPaddingBytes - 1;
    _data.clamp();
    _data.words[lastBytePos >>> 2] |= nPaddingBytes << 24 - lastBytePos % 4 * 8;
    _data.sigBytes += nPaddingBytes;
  },
  unpad(data) {
    const _data = data;
    const nPaddingBytes = _data.words[_data.sigBytes - 1 >>> 2] & 255;
    _data.sigBytes -= nPaddingBytes;
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/pad-iso10126.js
var Iso10126 = {
  pad(data, blockSize) {
    const blockSizeBytes = blockSize * 4;
    const nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
    data.concat(WordArray.random(nPaddingBytes - 1)).concat(WordArray.create([nPaddingBytes << 24], 1));
  },
  unpad(data) {
    const _data = data;
    const nPaddingBytes = _data.words[_data.sigBytes - 1 >>> 2] & 255;
    _data.sigBytes -= nPaddingBytes;
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/pad-zeropadding.js
var ZeroPadding = {
  pad(data, blockSize) {
    const _data = data;
    const blockSizeBytes = blockSize * 4;
    _data.clamp();
    _data.sigBytes += blockSizeBytes - (data.sigBytes % blockSizeBytes || blockSizeBytes);
  },
  unpad(data) {
    const _data = data;
    const dataWords = _data.words;
    for (let i3 = _data.sigBytes - 1; i3 >= 0; i3 -= 1) {
      if (dataWords[i3 >>> 2] >>> 24 - i3 % 4 * 8 & 255) {
        _data.sigBytes = i3 + 1;
        break;
      }
    }
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/pad-iso97971.js
var Iso97971 = {
  pad(data, blockSize) {
    data.concat(WordArray.create([2147483648], 1));
    ZeroPadding.pad(data, blockSize);
  },
  unpad(data) {
    const _data = data;
    ZeroPadding.unpad(_data);
    _data.sigBytes -= 1;
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/pad-nopadding.js
var NoPadding = {
  pad() {
  },
  unpad() {
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/format-hex.js
var HexFormatter = {
  /**
   * Converts the ciphertext of a cipher params object to a hexadecimally encoded string.
   *
   * @param {CipherParams} cipherParams The cipher params object.
   *
   * @return {string} The hexadecimally encoded string.
   *
   * @static
   *
   * @example
   *
   *     var hexString = CryptoJS.format.Hex.stringify(cipherParams);
   */
  stringify(cipherParams) {
    return cipherParams.ciphertext.toString(Hex);
  },
  /**
   * Converts a hexadecimally encoded ciphertext string to a cipher params object.
   *
   * @param {string} input The hexadecimally encoded string.
   *
   * @return {CipherParams} The cipher params object.
   *
   * @static
   *
   * @example
   *
   *     var cipherParams = CryptoJS.format.Hex.parse(hexString);
   */
  parse(input) {
    const ciphertext = Hex.parse(input);
    return CipherParams.create({ ciphertext });
  }
};

// node_modules/.pnpm/crypto-es@2.1.0/node_modules/crypto-es/lib/index.js
var lib_default = {
  lib: {
    Base,
    WordArray,
    BufferedBlockAlgorithm,
    Hasher,
    Cipher,
    StreamCipher,
    BlockCipherMode,
    BlockCipher,
    CipherParams,
    SerializableCipher,
    PasswordBasedCipher
  },
  x64: {
    Word: X64Word,
    WordArray: X64WordArray
  },
  enc: {
    Hex,
    Latin1,
    Utf8,
    Utf16,
    Utf16BE,
    Utf16LE,
    Base64,
    Base64url
  },
  algo: {
    HMAC,
    MD5: MD5Algo,
    SHA1: SHA1Algo,
    SHA224: SHA224Algo,
    SHA256: SHA256Algo,
    SHA384: SHA384Algo,
    SHA512: SHA512Algo,
    SHA3: SHA3Algo,
    RIPEMD160: RIPEMD160Algo,
    PBKDF2: PBKDF2Algo,
    EvpKDF: EvpKDFAlgo,
    AES: AESAlgo,
    DES: DESAlgo,
    TripleDES: TripleDESAlgo,
    Rabbit: RabbitAlgo,
    RabbitLegacy: RabbitLegacyAlgo,
    RC4: RC4Algo,
    RC4Drop: RC4DropAlgo,
    Blowfish: BlowfishAlgo
  },
  mode: {
    CBC,
    CFB,
    CTR,
    CTRGladman,
    ECB,
    OFB
  },
  pad: {
    Pkcs7,
    AnsiX923,
    Iso10126,
    Iso97971,
    NoPadding,
    ZeroPadding
  },
  format: {
    OpenSSL: OpenSSLFormatter,
    Hex: HexFormatter
  },
  kdf: {
    OpenSSL: OpenSSLKdf
  },
  MD5,
  HmacMD5,
  SHA1,
  HmacSHA1,
  SHA224,
  HmacSHA224,
  SHA256,
  HmacSHA256,
  SHA384,
  HmacSHA384,
  SHA512,
  HmacSHA512,
  SHA3,
  HmacSHA3,
  RIPEMD160,
  HmacRIPEMD160,
  PBKDF2,
  EvpKDF,
  AES,
  DES,
  TripleDES,
  Rabbit,
  RabbitLegacy,
  RC4,
  RC4Drop,
  Blowfish
};

// src/legacyCrypt.ts
function decryptLegacyValue(value, password) {
  return lib_default.AES.decrypt(value, password).toString(lib_default.enc.Utf8);
}

// src/migration.ts
function legacyCredentialsPresent(data) {
  return Boolean(
    data.apiKey || data.apiSecret || data.accessToken || data.accessTokenSecret || data.scheduling?.password
  );
}
function legacyCredentialsEncrypted(data) {
  return legacyCredentialsPresent(data) && Boolean(data.secureMode);
}
function readLegacyCredentials(data, password) {
  const decode = (value) => {
    if (!value) return "";
    return password ? decryptLegacyValue(value, password) : value;
  };
  return {
    apiKey: decode(data.apiKey),
    apiSecret: decode(data.apiSecret),
    accessToken: decode(data.accessToken),
    accessTokenSecret: decode(data.accessTokenSecret),
    schedulerPassword: data.scheduling?.password ?? ""
  };
}
function storeCredentials(app, accountId, credentials) {
  setAccountCredentials(app, accountId, credentials);
  if (credentials.schedulerPassword)
    setSecret(app, SECRET_IDS.schedulerPassword, credentials.schedulerPassword);
}
var MIGRATED_ACCOUNT_ID = "migrated-account";
function stageFixedSecretMigration(app, settings) {
  const credentials = {
    apiKey: getSecret(app, LEGACY_TWITTER_SECRET_IDS.apiKey),
    apiSecret: getSecret(app, LEGACY_TWITTER_SECRET_IDS.apiSecret),
    accessToken: getSecret(app, LEGACY_TWITTER_SECRET_IDS.accessToken),
    accessTokenSecret: getSecret(
      app,
      LEGACY_TWITTER_SECRET_IDS.accessTokenSecret
    )
  };
  if (!Object.values(credentials).some(Boolean)) return null;
  let account = settings.accounts.find(
    (candidate) => candidate.id === MIGRATED_ACCOUNT_ID
  );
  if (!account) {
    account = {
      id: MIGRATED_ACCOUNT_ID,
      name: settings.accounts.length === 0 ? "Default" : "Imported account"
    };
    settings.accounts.push(account);
  }
  if (!settings.accounts.some(({ id }) => id === settings.defaultAccountId)) {
    settings.defaultAccountId = account.id;
  }
  setAccountCredentials(app, account.id, credentials);
  return account;
}
function clearFixedTwitterSecrets(app) {
  for (const id of Object.values(LEGACY_TWITTER_SECRET_IDS)) {
    setSecret(app, id, "");
  }
}
function stripLegacyCredentials(data) {
  delete data.apiKey;
  delete data.apiSecret;
  delete data.accessToken;
  delete data.accessTokenSecret;
  delete data.secureMode;
  if (data.scheduling) delete data.scheduling.password;
}
function resolveSchedulerPassword(app, data) {
  const stored = app.secretStorage?.getSecret(SECRET_IDS.schedulerPassword);
  if (stored) return stored;
  if (!data.secureMode && data.scheduling?.password) {
    return data.scheduling.password;
  }
  return "";
}

// src/Modals/InputPromptModal.ts
var import_obsidian2 = require("obsidian");

// src/deferred.ts
function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

// src/Modals/InputPromptModal.ts
var InputPromptModal = class _InputPromptModal extends import_obsidian2.Modal {
  constructor(app, header, options, resolve) {
    super(app);
    this.options = options;
    this.resolve = resolve;
    this.submitted = false;
    this.value = options.value ?? "";
    this.setTitle(header);
  }
  static prompt(app, header, options = {}) {
    const { promise, resolve } = deferred();
    new _InputPromptModal(app, header, options, resolve).open();
    return promise;
  }
  onOpen() {
    new import_obsidian2.Setting(this.contentEl).addText((text) => {
      if (this.options.password) text.inputEl.type = "password";
      text.setPlaceholder(this.options.placeholder ?? "").setValue(this.value).onChange((value) => this.value = value);
      text.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.submit();
        }
      });
      window.setTimeout(() => {
        text.inputEl.focus();
        text.inputEl.select();
      }, 0);
    });
    new import_obsidian2.Setting(this.contentEl).addButton(
      (button) => button.setButtonText("OK").setCta().onClick(() => this.submit())
    );
  }
  submit() {
    this.submitted = true;
    this.close();
  }
  onClose() {
    this.resolve(this.submitted ? this.value : null);
    this.contentEl.empty();
  }
};

// src/Modals/ScheduledTweetsModal.ts
var import_obsidian4 = require("obsidian");

// src/datetime.ts
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
async function promptForDateTime(app) {
  const input = await InputPromptModal.prompt(app, "Schedule time", {
    placeholder: "today at 11:00"
  });
  if (input === null || input.trim() === "") return null;
  const appWithPlugins = app;
  const nld = appWithPlugins.plugins?.plugins?.["nldates-obsidian"];
  if (!nld?.parseDate) {
    throw new Error(
      "The Natural Language Dates plugin is required to schedule tweets."
    );
  }
  const parsed = nld.parseDate(input);
  if (!parsed?.date || Number.isNaN(parsed.date.getTime())) {
    throw new Error(`Could not understand the date "${input}".`);
  }
  return parsed.date.getTime();
}

// src/Modals/ComposeTweetModal.ts
var import_obsidian3 = require("obsidian");

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.array.index-of.js
var $export = require_export();
var $indexOf = require_array_includes()(false);
var $native = [].indexOf;
var NEGATIVE_ZERO = !!$native && 1 / [1].indexOf(1, -0) < 0;
$export($export.P + $export.F * (NEGATIVE_ZERO || !require_strict_method()($native)), "Array", {
  // 22.1.3.11 / 15.4.4.14 Array.prototype.indexOf(searchElement [, fromIndex])
  indexOf: function indexOf(searchElement) {
    return NEGATIVE_ZERO ? $native.apply(this, arguments) || 0 : $indexOf(this, searchElement, arguments[1]);
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.regexp.replace.js
var anObject = require_an_object();
var toObject = require_to_object();
var toLength = require_to_length();
var toInteger = require_to_integer();
var advanceStringIndex = require_advance_string_index();
var regExpExec = require_regexp_exec_abstract();
var max = Math.max;
var min = Math.min;
var floor = Math.floor;
var SUBSTITUTION_SYMBOLS = /\$([$&`']|\d\d?|<[^>]*>)/g;
var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&`']|\d\d?)/g;
var maybeToString = function(it) {
  return it === void 0 ? it : String(it);
};
require_fix_re_wks()("replace", 2, function(defined, REPLACE, $replace, maybeCallNative) {
  return [
    // `String.prototype.replace` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.replace
    function replace(searchValue, replaceValue) {
      var O = defined(this);
      var fn = searchValue == void 0 ? void 0 : searchValue[REPLACE];
      return fn !== void 0 ? fn.call(searchValue, O, replaceValue) : $replace.call(String(O), searchValue, replaceValue);
    },
    // `RegExp.prototype[@@replace]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@replace
    function(regexp, replaceValue) {
      var res = maybeCallNative($replace, regexp, this, replaceValue);
      if (res.done) return res.value;
      var rx = anObject(regexp);
      var S3 = String(this);
      var functionalReplace = typeof replaceValue === "function";
      if (!functionalReplace) replaceValue = String(replaceValue);
      var global4 = rx.global;
      if (global4) {
        var fullUnicode = rx.unicode;
        rx.lastIndex = 0;
      }
      var results = [];
      while (true) {
        var result = regExpExec(rx, S3);
        if (result === null) break;
        results.push(result);
        if (!global4) break;
        var matchStr = String(result[0]);
        if (matchStr === "") rx.lastIndex = advanceStringIndex(S3, toLength(rx.lastIndex), fullUnicode);
      }
      var accumulatedResult = "";
      var nextSourcePosition = 0;
      for (var i3 = 0; i3 < results.length; i3++) {
        result = results[i3];
        var matched = String(result[0]);
        var position = max(min(toInteger(result.index), S3.length), 0);
        var captures = [];
        for (var j = 1; j < result.length; j++) captures.push(maybeToString(result[j]));
        var namedCaptures = result.groups;
        if (functionalReplace) {
          var replacerArgs = [matched].concat(captures, position, S3);
          if (namedCaptures !== void 0) replacerArgs.push(namedCaptures);
          var replacement = String(replaceValue.apply(void 0, replacerArgs));
        } else {
          replacement = getSubstitution(matched, S3, position, captures, namedCaptures, replaceValue);
        }
        if (position >= nextSourcePosition) {
          accumulatedResult += S3.slice(nextSourcePosition, position) + replacement;
          nextSourcePosition = position + matched.length;
        }
      }
      return accumulatedResult + S3.slice(nextSourcePosition);
    }
  ];
  function getSubstitution(matched, str, position, captures, namedCaptures, replacement) {
    var tailPos = position + matched.length;
    var m = captures.length;
    var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
    if (namedCaptures !== void 0) {
      namedCaptures = toObject(namedCaptures);
      symbols = SUBSTITUTION_SYMBOLS;
    }
    return $replace.call(replacement, symbols, function(match, ch) {
      var capture;
      switch (ch.charAt(0)) {
        case "$":
          return "$";
        case "&":
          return matched;
        case "`":
          return str.slice(0, position);
        case "'":
          return str.slice(tailPos);
        case "<":
          capture = namedCaptures[ch.slice(1, -1)];
          break;
        default:
          var n2 = +ch;
          if (n2 === 0) return match;
          if (n2 > m) {
            var f6 = floor(n2 / 10);
            if (f6 === 0) return match;
            if (f6 <= m) return captures[f6 - 1] === void 0 ? ch.charAt(1) : captures[f6 - 1] + ch.charAt(1);
            return match;
          }
          capture = captures[n2 - 1];
      }
      return capture === void 0 ? "" : capture;
    });
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.regexp.constructor.js
var global2 = require_global();
var inheritIfRequired = require_inherit_if_required();
var dP = require_object_dp().f;
var gOPN = require_object_gopn().f;
var isRegExp = require_is_regexp();
var $flags = require_flags();
var $RegExp = global2.RegExp;
var Base2 = $RegExp;
var proto = $RegExp.prototype;
var re1 = /a/g;
var re2 = /a/g;
var CORRECT_NEW = new $RegExp(re1) !== re1;
if (require_descriptors() && (!CORRECT_NEW || require_fails()(function() {
  re2[require_wks()("match")] = false;
  return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, "i") != "/a/i";
}))) {
  $RegExp = function RegExp2(p, f6) {
    var tiRE = this instanceof $RegExp;
    var piRE = isRegExp(p);
    var fiU = f6 === void 0;
    return !tiRE && piRE && p.constructor === $RegExp && fiU ? p : inheritIfRequired(
      CORRECT_NEW ? new Base2(piRE && !fiU ? p.source : p, f6) : Base2((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f6),
      tiRE ? this : proto,
      $RegExp
    );
  };
  proxy = function(key2) {
    key2 in $RegExp || dP($RegExp, key2, {
      configurable: true,
      get: function() {
        return Base2[key2];
      },
      set: function(it) {
        Base2[key2] = it;
      }
    });
  };
  for (keys = gOPN(Base2), i = 0; keys.length > i; ) proxy(keys[i++]);
  proto.constructor = $RegExp;
  $RegExp.prototype = proto;
  require_redefine()(global2, "RegExp", $RegExp);
}
var proxy;
var keys;
var i;
require_set_species()("RegExp");

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.regexp.match.js
var anObject2 = require_an_object();
var toLength2 = require_to_length();
var advanceStringIndex2 = require_advance_string_index();
var regExpExec2 = require_regexp_exec_abstract();
require_fix_re_wks()("match", 1, function(defined, MATCH, $match, maybeCallNative) {
  return [
    // `String.prototype.match` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.match
    function match(regexp) {
      var O = defined(this);
      var fn = regexp == void 0 ? void 0 : regexp[MATCH];
      return fn !== void 0 ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
    },
    // `RegExp.prototype[@@match]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@match
    function(regexp) {
      var res = maybeCallNative($match, regexp, this);
      if (res.done) return res.value;
      var rx = anObject2(regexp);
      var S3 = String(this);
      if (!rx.global) return regExpExec2(rx, S3);
      var fullUnicode = rx.unicode;
      rx.lastIndex = 0;
      var A = [];
      var n2 = 0;
      var result;
      while ((result = regExpExec2(rx, S3)) !== null) {
        var matchStr = String(result[0]);
        A[n2] = matchStr;
        if (matchStr === "") rx.lastIndex = advanceStringIndex2(S3, toLength2(rx.lastIndex), fullUnicode);
        n2++;
      }
      return n2 === 0 ? null : A;
    }
  ];
});

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/lib/regexSupplant.js
function regexSupplant_default(regex, map, flags) {
  flags = flags || "";
  if (typeof regex !== "string") {
    if (regex.global && flags.indexOf("g") < 0) {
      flags += "g";
    }
    if (regex.ignoreCase && flags.indexOf("i") < 0) {
      flags += "i";
    }
    if (regex.multiline && flags.indexOf("m") < 0) {
      flags += "m";
    }
    regex = regex.source;
  }
  return new RegExp(regex.replace(/#\{(\w+)\}/g, function(match, name) {
    var newRegex = map[name] || "";
    if (typeof newRegex !== "string") {
      newRegex = newRegex.source;
    }
    return newRegex;
  }), flags);
}

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validCCTLD.js
var validCCTLD = regexSupplant_default(RegExp("(?:(?:\uD55C\uAD6D|\u9999\u6E2F|\u6FB3\u9580|\u65B0\u52A0\u5761|\u53F0\u7063|\u53F0\u6E7E|\u4E2D\u570B|\u4E2D\u56FD|\u10D2\u10D4|\u0EA5\u0EB2\u0EA7|\u0E44\u0E17\u0E22|\u0DBD\u0D82\u0D9A\u0DCF|\u0D2D\u0D3E\u0D30\u0D24\u0D02|\u0CAD\u0CBE\u0CB0\u0CA4|\u0C2D\u0C3E\u0C30\u0C24\u0C4D|\u0B9A\u0BBF\u0B99\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0BC2\u0BB0\u0BCD|\u0B87\u0BB2\u0B99\u0BCD\u0B95\u0BC8|\u0B87\u0BA8\u0BCD\u0BA4\u0BBF\u0BAF\u0BBE|\u0B2D\u0B3E\u0B30\u0B24|\u0AAD\u0ABE\u0AB0\u0AA4|\u0A2D\u0A3E\u0A30\u0A24|\u09AD\u09BE\u09F0\u09A4|\u09AD\u09BE\u09B0\u09A4|\u09AC\u09BE\u0982\u09B2\u09BE|\u092D\u093E\u0930\u094B\u0924|\u092D\u093E\u0930\u0924\u092E\u094D|\u092D\u093E\u0930\u0924|\u0680\u0627\u0631\u062A|\u067E\u0627\u06A9\u0633\u062A\u0627\u0646|\u0645\u0648\u0631\u064A\u062A\u0627\u0646\u064A\u0627|\u0645\u0644\u064A\u0633\u064A\u0627|\u0645\u0635\u0631|\u0642\u0637\u0631|\u0641\u0644\u0633\u0637\u064A\u0646|\u0639\u0645\u0627\u0646|\u0639\u0631\u0627\u0642|\u0633\u0648\u0631\u064A\u0629|\u0633\u0648\u062F\u0627\u0646|\u062A\u0648\u0646\u0633|\u0628\u06BE\u0627\u0631\u062A|\u0628\u0627\u0631\u062A|\u0627\u06CC\u0631\u0627\u0646|\u0627\u0645\u0627\u0631\u0627\u062A|\u0627\u0644\u0645\u063A\u0631\u0628|\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629|\u0627\u0644\u062C\u0632\u0627\u0626\u0631|\u0627\u0644\u0628\u062D\u0631\u064A\u0646|\u0627\u0644\u0627\u0631\u062F\u0646|\u0570\u0561\u0575|\u049B\u0430\u0437|\u0443\u043A\u0440|\u0441\u0440\u0431|\u0440\u0444|\u043C\u043E\u043D|\u043C\u043A\u0434|\u0435\u044E|\u0431\u0435\u043B|\u0431\u0433|\u03B5\u03C5|\u03B5\u03BB|zw|zm|za|yt|ye|ws|wf|vu|vn|vi|vg|ve|vc|va|uz|uy|us|um|uk|ug|ua|tz|tw|tv|tt|tr|tp|to|tn|tm|tl|tk|tj|th|tg|tf|td|tc|sz|sy|sx|sv|su|st|ss|sr|so|sn|sm|sl|sk|sj|si|sh|sg|se|sd|sc|sb|sa|rw|ru|rs|ro|re|qa|py|pw|pt|ps|pr|pn|pm|pl|pk|ph|pg|pf|pe|pa|om|nz|nu|nr|np|no|nl|ni|ng|nf|ne|nc|na|mz|my|mx|mw|mv|mu|mt|ms|mr|mq|mp|mo|mn|mm|ml|mk|mh|mg|mf|me|md|mc|ma|ly|lv|lu|lt|ls|lr|lk|li|lc|lb|la|kz|ky|kw|kr|kp|kn|km|ki|kh|kg|ke|jp|jo|jm|je|it|is|ir|iq|io|in|im|il|ie|id|hu|ht|hr|hn|hm|hk|gy|gw|gu|gt|gs|gr|gq|gp|gn|gm|gl|gi|gh|gg|gf|ge|gd|gb|ga|fr|fo|fm|fk|fj|fi|eu|et|es|er|eh|eg|ee|ec|dz|do|dm|dk|dj|de|cz|cy|cx|cw|cv|cu|cr|co|cn|cm|cl|ck|ci|ch|cg|cf|cd|cc|ca|bz|by|bw|bv|bt|bs|br|bq|bo|bn|bm|bl|bj|bi|bh|bg|bf|be|bd|bb|ba|az|ax|aw|au|at|as|ar|aq|ao|an|am|al|ai|ag|af|ae|ad|ac)(?=[^0-9a-zA-Z@+-]|$))"));
var validCCTLD_default = validCCTLD;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/directionalMarkersGroup.js
var directionalMarkersGroup = /\u202A-\u202E\u061C\u200E\u200F\u2066\u2067\u2068\u2069/;
var directionalMarkersGroup_default = directionalMarkersGroup;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/invalidCharsGroup.js
var invalidCharsGroup = /\uFFFE\uFEFF\uFFFF/;
var invalidCharsGroup_default = invalidCharsGroup;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/punct.js
var punct = /\!'#%&'\(\)*\+,\\\-\.\/:;<=>\?@\[\]\^_{|}~\$/;
var punct_default = punct;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/spacesGroup.js
var spacesGroup = /\x09-\x0D\x20\x85\xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000/;
var spacesGroup_default = spacesGroup;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/lib/stringSupplant.js
function stringSupplant_default(str, map) {
  return str.replace(/#\{(\w+)\}/g, function(match, name) {
    return map[name] || "";
  });
}

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/invalidDomainChars.js
var invalidDomainChars = stringSupplant_default("#{punct}#{spacesGroup}#{invalidCharsGroup}#{directionalMarkersGroup}", {
  punct: punct_default,
  spacesGroup: spacesGroup_default,
  invalidCharsGroup: invalidCharsGroup_default,
  directionalMarkersGroup: directionalMarkersGroup_default
});
var invalidDomainChars_default = invalidDomainChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validDomainChars.js
var validDomainChars = regexSupplant_default(/[^#{invalidDomainChars}]/, {
  invalidDomainChars: invalidDomainChars_default
});
var validDomainChars_default = validDomainChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validDomainName.js
var validDomainName = regexSupplant_default(/(?:(?:#{validDomainChars}(?:-|#{validDomainChars})*)?#{validDomainChars}\.)/, {
  validDomainChars: validDomainChars_default
});
var validDomainName_default = validDomainName;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validGTLD.js
var validGTLD = regexSupplant_default(RegExp("(?:(?:\uC0BC\uC131|\uB2F7\uCEF4|\uB2F7\uB137|\u9999\u683C\u91CC\u62C9|\u9910\u5385|\u98DF\u54C1|\u98DE\u5229\u6D66|\u96FB\u8A0A\u76C8\u79D1|\u96C6\u56E2|\u901A\u8CA9|\u8D2D\u7269|\u8C37\u6B4C|\u8BFA\u57FA\u4E9A|\u8054\u901A|\u7F51\u7EDC|\u7F51\u7AD9|\u7F51\u5E97|\u7F51\u5740|\u7EC4\u7EC7\u673A\u6784|\u79FB\u52A8|\u73E0\u5B9D|\u70B9\u770B|\u6E38\u620F|\u6DE1\u9A6C\u9521|\u673A\u6784|\u66F8\u7C4D|\u65F6\u5C1A|\u65B0\u95FB|\u653F\u5E9C|\u653F\u52A1|\u62DB\u8058|\u624B\u8868|\u624B\u673A|\u6211\u7231\u4F60|\u6148\u5584|\u5FAE\u535A|\u5E7F\u4E1C|\u5DE5\u884C|\u5BB6\u96FB|\u5A31\u4E50|\u5929\u4E3B\u6559|\u5927\u62FF|\u5927\u4F17\u6C7D\u8F66|\u5728\u7EBF|\u5609\u91CC\u5927\u9152\u5E97|\u5609\u91CC|\u5546\u6807|\u5546\u5E97|\u5546\u57CE|\u516C\u76CA|\u516C\u53F8|\u516B\u5366|\u5065\u5EB7|\u4FE1\u606F|\u4F5B\u5C71|\u4F01\u4E1A|\u4E2D\u6587\u7F51|\u4E2D\u4FE1|\u4E16\u754C|\u30DD\u30A4\u30F3\u30C8|\u30D5\u30A1\u30C3\u30B7\u30E7\u30F3|\u30BB\u30FC\u30EB|\u30B9\u30C8\u30A2|\u30B3\u30E0|\u30B0\u30FC\u30B0\u30EB|\u30AF\u30E9\u30A6\u30C9|\u307F\u3093\u306A|\u0E04\u0E2D\u0E21|\u0938\u0902\u0917\u0920\u0928|\u0928\u0947\u091F|\u0915\u0949\u092E|\u0647\u0645\u0631\u0627\u0647|\u0645\u0648\u0642\u0639|\u0645\u0648\u0628\u0627\u064A\u0644\u064A|\u0643\u0648\u0645|\u0643\u0627\u062B\u0648\u0644\u064A\u0643|\u0639\u0631\u0628|\u0634\u0628\u0643\u0629|\u0628\u064A\u062A\u0643|\u0628\u0627\u0632\u0627\u0631|\u0627\u0644\u0639\u0644\u064A\u0627\u0646|\u0627\u0631\u0627\u0645\u0643\u0648|\u0627\u062A\u0635\u0627\u0644\u0627\u062A|\u0627\u0628\u0648\u0638\u0628\u064A|\u05E7\u05D5\u05DD|\u0441\u0430\u0439\u0442|\u0440\u0443\u0441|\u043E\u0440\u0433|\u043E\u043D\u043B\u0430\u0439\u043D|\u043C\u043E\u0441\u043A\u0432\u0430|\u043A\u043E\u043C|\u043A\u0430\u0442\u043E\u043B\u0438\u043A|\u0434\u0435\u0442\u0438|zuerich|zone|zippo|zip|zero|zara|zappos|yun|youtube|you|yokohama|yoga|yodobashi|yandex|yamaxun|yahoo|yachts|xyz|xxx|xperia|xin|xihuan|xfinity|xerox|xbox|wtf|wtc|wow|world|works|work|woodside|wolterskluwer|wme|winners|wine|windows|win|williamhill|wiki|wien|whoswho|weir|weibo|wedding|wed|website|weber|webcam|weatherchannel|weather|watches|watch|warman|wanggou|wang|walter|walmart|wales|vuelos|voyage|voto|voting|vote|volvo|volkswagen|vodka|vlaanderen|vivo|viva|vistaprint|vista|vision|visa|virgin|vip|vin|villas|viking|vig|video|viajes|vet|versicherung|verm\xF6gensberatung|verm\xF6gensberater|verisign|ventures|vegas|vanguard|vana|vacations|ups|uol|uno|university|unicom|uconnect|ubs|ubank|tvs|tushu|tunes|tui|tube|trv|trust|travelersinsurance|travelers|travelchannel|travel|training|trading|trade|toys|toyota|town|tours|total|toshiba|toray|top|tools|tokyo|today|tmall|tkmaxx|tjx|tjmaxx|tirol|tires|tips|tiffany|tienda|tickets|tiaa|theatre|theater|thd|teva|tennis|temasek|telefonica|telecity|tel|technology|tech|team|tdk|tci|taxi|tax|tattoo|tatar|tatamotors|target|taobao|talk|taipei|tab|systems|symantec|sydney|swiss|swiftcover|swatch|suzuki|surgery|surf|support|supply|supplies|sucks|style|study|studio|stream|store|storage|stockholm|stcgroup|stc|statoil|statefarm|statebank|starhub|star|staples|stada|srt|srl|spreadbetting|spot|sport|spiegel|space|soy|sony|song|solutions|solar|sohu|software|softbank|social|soccer|sncf|smile|smart|sling|skype|sky|skin|ski|site|singles|sina|silk|shriram|showtime|show|shouji|shopping|shop|shoes|shiksha|shia|shell|shaw|sharp|shangrila|sfr|sexy|sex|sew|seven|ses|services|sener|select|seek|security|secure|seat|search|scot|scor|scjohnson|science|schwarz|schule|school|scholarships|schmidt|schaeffler|scb|sca|sbs|sbi|saxo|save|sas|sarl|sapo|sap|sanofi|sandvikcoromant|sandvik|samsung|samsclub|salon|sale|sakura|safety|safe|saarland|ryukyu|rwe|run|ruhr|rugby|rsvp|room|rogers|rodeo|rocks|rocher|rmit|rip|rio|ril|rightathome|ricoh|richardli|rich|rexroth|reviews|review|restaurant|rest|republican|report|repair|rentals|rent|ren|reliance|reit|reisen|reise|rehab|redumbrella|redstone|red|recipes|realty|realtor|realestate|read|raid|radio|racing|qvc|quest|quebec|qpon|pwc|pub|prudential|pru|protection|property|properties|promo|progressive|prof|productions|prod|pro|prime|press|praxi|pramerica|post|porn|politie|poker|pohl|pnc|plus|plumbing|playstation|play|place|pizza|pioneer|pink|ping|pin|pid|pictures|pictet|pics|piaget|physio|photos|photography|photo|phone|philips|phd|pharmacy|pfizer|pet|pccw|pay|passagens|party|parts|partners|pars|paris|panerai|panasonic|pamperedchef|page|ovh|ott|otsuka|osaka|origins|orientexpress|organic|org|orange|oracle|open|ooo|onyourside|online|onl|ong|one|omega|ollo|oldnavy|olayangroup|olayan|okinawa|office|off|observer|obi|nyc|ntt|nrw|nra|nowtv|nowruz|now|norton|northwesternmutual|nokia|nissay|nissan|ninja|nikon|nike|nico|nhk|ngo|nfl|nexus|nextdirect|next|news|newholland|new|neustar|network|netflix|netbank|net|nec|nba|navy|natura|nationwide|name|nagoya|nadex|nab|mutuelle|mutual|museum|mtr|mtpc|mtn|msd|movistar|movie|mov|motorcycles|moto|moscow|mortgage|mormon|mopar|montblanc|monster|money|monash|mom|moi|moe|moda|mobily|mobile|mobi|mma|mls|mlb|mitsubishi|mit|mint|mini|mil|microsoft|miami|metlife|merckmsd|meo|menu|men|memorial|meme|melbourne|meet|media|med|mckinsey|mcdonalds|mcd|mba|mattel|maserati|marshalls|marriott|markets|marketing|market|map|mango|management|man|makeup|maison|maif|madrid|macys|luxury|luxe|lupin|lundbeck|ltda|ltd|lplfinancial|lpl|love|lotto|lotte|london|lol|loft|locus|locker|loans|loan|llp|llc|lixil|living|live|lipsy|link|linde|lincoln|limo|limited|lilly|like|lighting|lifestyle|lifeinsurance|life|lidl|liaison|lgbt|lexus|lego|legal|lefrak|leclerc|lease|lds|lawyer|law|latrobe|latino|lat|lasalle|lanxess|landrover|land|lancome|lancia|lancaster|lamer|lamborghini|ladbrokes|lacaixa|kyoto|kuokgroup|kred|krd|kpn|kpmg|kosher|komatsu|koeln|kiwi|kitchen|kindle|kinder|kim|kia|kfh|kerryproperties|kerrylogistics|kerryhotels|kddi|kaufen|juniper|juegos|jprs|jpmorgan|joy|jot|joburg|jobs|jnj|jmp|jll|jlc|jio|jewelry|jetzt|jeep|jcp|jcb|java|jaguar|iwc|iveco|itv|itau|istanbul|ist|ismaili|iselect|irish|ipiranga|investments|intuit|international|intel|int|insure|insurance|institute|ink|ing|info|infiniti|industries|inc|immobilien|immo|imdb|imamat|ikano|iinet|ifm|ieee|icu|ice|icbc|ibm|hyundai|hyatt|hughes|htc|hsbc|how|house|hotmail|hotels|hoteles|hot|hosting|host|hospital|horse|honeywell|honda|homesense|homes|homegoods|homedepot|holiday|holdings|hockey|hkt|hiv|hitachi|hisamitsu|hiphop|hgtv|hermes|here|helsinki|help|healthcare|health|hdfcbank|hdfc|hbo|haus|hangout|hamburg|hair|guru|guitars|guide|guge|gucci|guardian|group|grocery|gripe|green|gratis|graphics|grainger|gov|got|gop|google|goog|goodyear|goodhands|goo|golf|goldpoint|gold|godaddy|gmx|gmo|gmbh|gmail|globo|global|gle|glass|glade|giving|gives|gifts|gift|ggee|george|genting|gent|gea|gdn|gbiz|gay|garden|gap|games|game|gallup|gallo|gallery|gal|fyi|futbol|furniture|fund|fun|fujixerox|fujitsu|ftr|frontier|frontdoor|frogans|frl|fresenius|free|fox|foundation|forum|forsale|forex|ford|football|foodnetwork|food|foo|fly|flsmidth|flowers|florist|flir|flights|flickr|fitness|fit|fishing|fish|firmdale|firestone|fire|financial|finance|final|film|fido|fidelity|fiat|ferrero|ferrari|feedback|fedex|fast|fashion|farmers|farm|fans|fan|family|faith|fairwinds|fail|fage|extraspace|express|exposed|expert|exchange|everbank|events|eus|eurovision|etisalat|esurance|estate|esq|erni|ericsson|equipment|epson|epost|enterprises|engineering|engineer|energy|emerck|email|education|edu|edeka|eco|eat|earth|dvr|dvag|durban|dupont|duns|dunlop|duck|dubai|dtv|drive|download|dot|doosan|domains|doha|dog|dodge|doctor|docs|dnp|diy|dish|discover|discount|directory|direct|digital|diet|diamonds|dhl|dev|design|desi|dentist|dental|democrat|delta|deloitte|dell|delivery|degree|deals|dealer|deal|dds|dclk|day|datsun|dating|date|data|dance|dad|dabur|cyou|cymru|cuisinella|csc|cruises|cruise|crs|crown|cricket|creditunion|creditcard|credit|cpa|courses|coupons|coupon|country|corsica|coop|cool|cookingchannel|cooking|contractors|contact|consulting|construction|condos|comsec|computer|compare|company|community|commbank|comcast|com|cologne|college|coffee|codes|coach|clubmed|club|cloud|clothing|clinique|clinic|click|cleaning|claims|cityeats|city|citic|citi|citadel|cisco|circle|cipriani|church|chrysler|chrome|christmas|chloe|chintai|cheap|chat|chase|charity|channel|chanel|cfd|cfa|cern|ceo|center|ceb|cbs|cbre|cbn|cba|catholic|catering|cat|casino|cash|caseih|case|casa|cartier|cars|careers|career|care|cards|caravan|car|capitalone|capital|capetown|canon|cancerresearch|camp|camera|cam|calvinklein|call|cal|cafe|cab|bzh|buzz|buy|business|builders|build|bugatti|budapest|brussels|brother|broker|broadway|bridgestone|bradesco|box|boutique|bot|boston|bostik|bosch|boots|booking|book|boo|bond|bom|bofa|boehringer|boats|bnpparibas|bnl|bmw|bms|blue|bloomberg|blog|blockbuster|blanco|blackfriday|black|biz|bio|bingo|bing|bike|bid|bible|bharti|bet|bestbuy|best|berlin|bentley|beer|beauty|beats|bcn|bcg|bbva|bbt|bbc|bayern|bauhaus|basketball|baseball|bargains|barefoot|barclays|barclaycard|barcelona|bar|bank|band|bananarepublic|banamex|baidu|baby|azure|axa|aws|avianca|autos|auto|author|auspost|audio|audible|audi|auction|attorney|athleta|associates|asia|asda|arte|art|arpa|army|archi|aramco|arab|aquarelle|apple|app|apartments|aol|anz|anquan|android|analytics|amsterdam|amica|amfam|amex|americanfamily|americanexpress|alstom|alsace|ally|allstate|allfinanz|alipay|alibaba|alfaromeo|akdn|airtel|airforce|airbus|aigo|aig|agency|agakhan|africa|afl|afamilycompany|aetna|aero|aeg|adult|ads|adac|actor|active|aco|accountants|accountant|accenture|academy|abudhabi|abogado|able|abc|abbvie|abbott|abb|abarth|aarp|aaa|onion)(?=[^0-9a-zA-Z@+-]|$))"));
var validGTLD_default = validGTLD;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validPunycode.js
var validPunycode = /(?:xn--[\-0-9a-z]+)/;
var validPunycode_default = validPunycode;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validSubdomain.js
var validSubdomain = regexSupplant_default(/(?:(?:#{validDomainChars}(?:[_-]|#{validDomainChars})*)?#{validDomainChars}\.)/, {
  validDomainChars: validDomainChars_default
});
var validSubdomain_default = validSubdomain;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validDomain.js
var validDomain = regexSupplant_default(/(?:#{validSubdomain}*#{validDomainName}(?:#{validGTLD}|#{validCCTLD}|#{validPunycode}))/, {
  validDomainName: validDomainName_default,
  validSubdomain: validSubdomain_default,
  validGTLD: validGTLD_default,
  validCCTLD: validCCTLD_default,
  validPunycode: validPunycode_default
});
var validDomain_default = validDomain;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validPortNumber.js
var validPortNumber = /[0-9]+/;
var validPortNumber_default = validPortNumber;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/cyrillicLettersAndMarks.js
var cyrillicLettersAndMarks = /\u0400-\u04FF/;
var cyrillicLettersAndMarks_default = cyrillicLettersAndMarks;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/latinAccentChars.js
var latinAccentChars = /\xC0-\xD6\xD8-\xF6\xF8-\xFF\u0100-\u024F\u0253\u0254\u0256\u0257\u0259\u025B\u0263\u0268\u026F\u0272\u0289\u028B\u02BB\u0300-\u036F\u1E00-\u1EFF/;
var latinAccentChars_default = latinAccentChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validGeneralUrlPathChars.js
var validGeneralUrlPathChars = regexSupplant_default(/[a-z#{cyrillicLettersAndMarks}0-9!\*';:=\+,\.\$\/%#\[\]\-\u2013_~@\|&#{latinAccentChars}]/i, {
  cyrillicLettersAndMarks: cyrillicLettersAndMarks_default,
  latinAccentChars: latinAccentChars_default
});
var validGeneralUrlPathChars_default = validGeneralUrlPathChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validUrlBalancedParens.js
var validUrlBalancedParens = regexSupplant_default("\\((?:#{validGeneralUrlPathChars}+|(?:#{validGeneralUrlPathChars}*\\(#{validGeneralUrlPathChars}+\\)#{validGeneralUrlPathChars}*))\\)", {
  validGeneralUrlPathChars: validGeneralUrlPathChars_default
}, "i");
var validUrlBalancedParens_default = validUrlBalancedParens;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validUrlPathEndingChars.js
var validUrlPathEndingChars = regexSupplant_default(/[\+\-a-z#{cyrillicLettersAndMarks}0-9=_#\/#{latinAccentChars}]|(?:#{validUrlBalancedParens})/i, {
  cyrillicLettersAndMarks: cyrillicLettersAndMarks_default,
  latinAccentChars: latinAccentChars_default,
  validUrlBalancedParens: validUrlBalancedParens_default
});
var validUrlPathEndingChars_default = validUrlPathEndingChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validUrlPath.js
var validUrlPath = regexSupplant_default("(?:(?:#{validGeneralUrlPathChars}*(?:#{validUrlBalancedParens}#{validGeneralUrlPathChars}*)*#{validUrlPathEndingChars})|(?:@#{validGeneralUrlPathChars}+/))", {
  validGeneralUrlPathChars: validGeneralUrlPathChars_default,
  validUrlBalancedParens: validUrlBalancedParens_default,
  validUrlPathEndingChars: validUrlPathEndingChars_default
}, "i");
var validUrlPath_default = validUrlPath;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validUrlPrecedingChars.js
var validUrlPrecedingChars = regexSupplant_default(/(?:[^A-Za-z0-9@＠$#＃#{invalidCharsGroup}]|[#{directionalMarkersGroup}]|^)/, {
  invalidCharsGroup: invalidCharsGroup_default,
  directionalMarkersGroup: directionalMarkersGroup_default
});
var validUrlPrecedingChars_default = validUrlPrecedingChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validUrlQueryChars.js
var validUrlQueryChars = /[a-z0-9!?\*'@\(\);:&=\+\$\/%#\[\]\-_\.,~|]/i;
var validUrlQueryChars_default = validUrlQueryChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validUrlQueryEndingChars.js
var validUrlQueryEndingChars = /[a-z0-9\-_&=#\/]/i;
var validUrlQueryEndingChars_default = validUrlQueryEndingChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/extractUrl.js
var extractUrl = regexSupplant_default("((#{validUrlPrecedingChars})((https?:\\/\\/)?(#{validDomain})(?::(#{validPortNumber}))?(\\/#{validUrlPath}*)?(\\?#{validUrlQueryChars}*#{validUrlQueryEndingChars})?))", {
  validUrlPrecedingChars: validUrlPrecedingChars_default,
  validDomain: validDomain_default,
  validPortNumber: validPortNumber_default,
  validUrlPath: validUrlPath_default,
  validUrlQueryChars: validUrlQueryChars_default,
  validUrlQueryEndingChars: validUrlQueryEndingChars_default
}, "gi");
var extractUrl_default = extractUrl;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/invalidUrlWithoutProtocolPrecedingChars.js
var invalidUrlWithoutProtocolPrecedingChars = /[-_.\/]$/;
var invalidUrlWithoutProtocolPrecedingChars_default = invalidUrlWithoutProtocolPrecedingChars;

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.regexp.split.js
var isRegExp2 = require_is_regexp();
var anObject3 = require_an_object();
var speciesConstructor = require_species_constructor();
var advanceStringIndex3 = require_advance_string_index();
var toLength3 = require_to_length();
var callRegExpExec = require_regexp_exec_abstract();
var regexpExec = require_regexp_exec();
var fails = require_fails();
var $min = Math.min;
var $push = [].push;
var $SPLIT = "split";
var LENGTH = "length";
var LAST_INDEX = "lastIndex";
var MAX_UINT32 = 4294967295;
var SUPPORTS_Y = !fails(function() {
  RegExp(MAX_UINT32, "y");
});
require_fix_re_wks()("split", 2, function(defined, SPLIT, $split, maybeCallNative) {
  var internalSplit;
  if ("abbc"[$SPLIT](/(b)*/)[1] == "c" || "test"[$SPLIT](/(?:)/, -1)[LENGTH] != 4 || "ab"[$SPLIT](/(?:ab)*/)[LENGTH] != 2 || "."[$SPLIT](/(.?)(.?)/)[LENGTH] != 4 || "."[$SPLIT](/()()/)[LENGTH] > 1 || ""[$SPLIT](/.?/)[LENGTH]) {
    internalSplit = function(separator, limit) {
      var string = String(this);
      if (separator === void 0 && limit === 0) return [];
      if (!isRegExp2(separator)) return $split.call(string, separator, limit);
      var output = [];
      var flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.unicode ? "u" : "") + (separator.sticky ? "y" : "");
      var lastLastIndex = 0;
      var splitLimit = limit === void 0 ? MAX_UINT32 : limit >>> 0;
      var separatorCopy = new RegExp(separator.source, flags + "g");
      var match, lastIndex, lastLength;
      while (match = regexpExec.call(separatorCopy, string)) {
        lastIndex = separatorCopy[LAST_INDEX];
        if (lastIndex > lastLastIndex) {
          output.push(string.slice(lastLastIndex, match.index));
          if (match[LENGTH] > 1 && match.index < string[LENGTH]) $push.apply(output, match.slice(1));
          lastLength = match[0][LENGTH];
          lastLastIndex = lastIndex;
          if (output[LENGTH] >= splitLimit) break;
        }
        if (separatorCopy[LAST_INDEX] === match.index) separatorCopy[LAST_INDEX]++;
      }
      if (lastLastIndex === string[LENGTH]) {
        if (lastLength || !separatorCopy.test("")) output.push("");
      } else output.push(string.slice(lastLastIndex));
      return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
    };
  } else if ("0"[$SPLIT](void 0, 0)[LENGTH]) {
    internalSplit = function(separator, limit) {
      return separator === void 0 && limit === 0 ? [] : $split.call(this, separator, limit);
    };
  } else {
    internalSplit = $split;
  }
  return [
    // `String.prototype.split` method
    // https://tc39.github.io/ecma262/#sec-string.prototype.split
    function split(separator, limit) {
      var O = defined(this);
      var splitter = separator == void 0 ? void 0 : separator[SPLIT];
      return splitter !== void 0 ? splitter.call(separator, O, limit) : internalSplit.call(String(O), separator, limit);
    },
    // `RegExp.prototype[@@split]` method
    // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@split
    //
    // NOTE: This cannot be properly polyfilled in engines that don't support
    // the 'y' flag.
    function(regexp, limit) {
      var res = maybeCallNative(internalSplit, regexp, this, limit, internalSplit !== $split);
      if (res.done) return res.value;
      var rx = anObject3(regexp);
      var S3 = String(this);
      var C = speciesConstructor(rx, RegExp);
      var unicodeMatching = rx.unicode;
      var flags = (rx.ignoreCase ? "i" : "") + (rx.multiline ? "m" : "") + (rx.unicode ? "u" : "") + (SUPPORTS_Y ? "y" : "g");
      var splitter = new C(SUPPORTS_Y ? rx : "^(?:" + rx.source + ")", flags);
      var lim = limit === void 0 ? MAX_UINT32 : limit >>> 0;
      if (lim === 0) return [];
      if (S3.length === 0) return callRegExpExec(splitter, S3) === null ? [S3] : [];
      var p = 0;
      var q = 0;
      var A = [];
      while (q < S3.length) {
        splitter.lastIndex = SUPPORTS_Y ? q : 0;
        var z = callRegExpExec(splitter, SUPPORTS_Y ? S3 : S3.slice(q));
        var e;
        if (z === null || (e = $min(toLength3(splitter.lastIndex + (SUPPORTS_Y ? 0 : q)), S3.length)) === p) {
          q = advanceStringIndex3(S3, q, unicodeMatching);
        } else {
          A.push(S3.slice(p, q));
          if (A.length === lim) return A;
          for (var i3 = 1; i3 <= z.length - 1; i3++) {
            A.push(z[i3]);
            if (A.length === lim) return A;
          }
          q = p = e;
        }
      }
      A.push(S3.slice(p));
      return A;
    }
  ];
});

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/lib/idna.js
var import_punycode = __toESM(require_punycode());

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validAsciiDomain.js
var validAsciiDomain = regexSupplant_default(/(?:(?:[\-a-z0-9#{latinAccentChars}]+)\.)+(?:#{validGTLD}|#{validCCTLD}|#{validPunycode})/gi, {
  latinAccentChars: latinAccentChars_default,
  validGTLD: validGTLD_default,
  validCCTLD: validCCTLD_default,
  validPunycode: validPunycode_default
});
var validAsciiDomain_default = validAsciiDomain;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/lib/idna.js
var MAX_DOMAIN_LABEL_LENGTH = 63;
var PUNYCODE_ENCODED_DOMAIN_PREFIX = "xn--";
var idna = {
  toAscii: function toAscii(domain) {
    if (domain.substring(0, 4) === PUNYCODE_ENCODED_DOMAIN_PREFIX && !domain.match(validAsciiDomain_default)) {
      return;
    }
    var labels = domain.split(".");
    for (var i3 = 0; i3 < labels.length; i3++) {
      var label = labels[i3];
      var punycodeEncodedLabel = import_punycode.default.toASCII(label);
      if (punycodeEncodedLabel.length < 1 || punycodeEncodedLabel.length > MAX_DOMAIN_LABEL_LENGTH) {
        return;
      }
    }
    return labels.join(".");
  }
};
var idna_default = idna;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/validTcoUrl.js
var validTcoUrl = regexSupplant_default(/^https?:\/\/t\.co\/([a-z0-9]+)(?:\?#{validUrlQueryChars}*#{validUrlQueryEndingChars})?/, {
  validUrlQueryChars: validUrlQueryChars_default,
  validUrlQueryEndingChars: validUrlQueryEndingChars_default
}, "i");
var validTcoUrl_default = validTcoUrl;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/extractUrlsWithIndices.js
var DEFAULT_PROTOCOL = "https://";
var DEFAULT_PROTOCOL_OPTIONS = {
  extractUrlsWithoutProtocol: true
};
var MAX_URL_LENGTH = 4096;
var MAX_TCO_SLUG_LENGTH = 40;
var extractUrlsWithIndices = function extractUrlsWithIndices2(text) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : DEFAULT_PROTOCOL_OPTIONS;
  if (!text || (options.extractUrlsWithoutProtocol ? !text.match(/\./) : !text.match(/:/))) {
    return [];
  }
  var urls = [];
  var _loop = function _loop2() {
    var before = RegExp.$2;
    var url = RegExp.$3;
    var protocol = RegExp.$4;
    var domain = RegExp.$5;
    var path = RegExp.$7;
    var endPosition = extractUrl_default.lastIndex;
    var startPosition = endPosition - url.length;
    if (!isValidUrl(url, protocol || DEFAULT_PROTOCOL, domain)) {
      return "continue";
    }
    if (!protocol) {
      if (!options.extractUrlsWithoutProtocol || before.match(invalidUrlWithoutProtocolPrecedingChars_default)) {
        return "continue";
      }
      var lastUrl = null;
      var asciiEndPosition = 0;
      domain.replace(validAsciiDomain_default, function(asciiDomain) {
        var asciiStartPosition = domain.indexOf(asciiDomain, asciiEndPosition);
        asciiEndPosition = asciiStartPosition + asciiDomain.length;
        lastUrl = {
          url: asciiDomain,
          indices: [startPosition + asciiStartPosition, startPosition + asciiEndPosition]
        };
        urls.push(lastUrl);
      });
      if (lastUrl == null) {
        return "continue";
      }
      if (path) {
        lastUrl.url = url.replace(domain, lastUrl.url);
        lastUrl.indices[1] = endPosition;
      }
    } else {
      if (url.match(validTcoUrl_default)) {
        var tcoUrlSlug = RegExp.$1;
        if (tcoUrlSlug && tcoUrlSlug.length > MAX_TCO_SLUG_LENGTH) {
          return "continue";
        } else {
          url = RegExp.lastMatch;
          endPosition = startPosition + url.length;
        }
      }
      urls.push({
        url,
        indices: [startPosition, endPosition]
      });
    }
  };
  while (extractUrl_default.exec(text)) {
    var _ret = _loop();
    if (_ret === "continue") continue;
  }
  return urls;
};
var isValidUrl = function isValidUrl2(url, protocol, domain) {
  var urlLength = url.length;
  var punycodeEncodedDomain = idna_default.toAscii(domain);
  if (!punycodeEncodedDomain || !punycodeEncodedDomain.length) {
    return false;
  }
  urlLength = urlLength + punycodeEncodedDomain.length - domain.length;
  return protocol.length + urlLength <= MAX_URL_LENGTH;
};
var extractUrlsWithIndices_default = extractUrlsWithIndices;

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.array.reduce.js
var $export2 = require_export();
var $reduce = require_array_reduce();
$export2($export2.P + $export2.F * !require_strict_method()([].reduce, true), "Array", {
  // 22.1.3.18 / 15.4.4.21 Array.prototype.reduce(callbackfn [, initialValue])
  reduce: function reduce(callbackfn) {
    return $reduce(this, callbackfn, arguments.length, arguments[1], false);
  }
});

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/web.dom.iterable.js
var $iterators = require_es6_array_iterator();
var getKeys = require_object_keys();
var redefine = require_redefine();
var global3 = require_global();
var hide = require_hide();
var Iterators = require_iterators();
var wks = require_wks();
var ITERATOR = wks("iterator");
var TO_STRING_TAG = wks("toStringTag");
var ArrayValues = Iterators.Array;
var DOMIterables = {
  CSSRuleList: true,
  // TODO: Not spec compliant, should be false.
  CSSStyleDeclaration: false,
  CSSValueList: false,
  ClientRectList: false,
  DOMRectList: false,
  DOMStringList: false,
  DOMTokenList: true,
  DataTransferItemList: false,
  FileList: false,
  HTMLAllCollection: false,
  HTMLCollection: false,
  HTMLFormElement: false,
  HTMLSelectElement: false,
  MediaList: true,
  // TODO: Not spec compliant, should be false.
  MimeTypeArray: false,
  NamedNodeMap: false,
  NodeList: true,
  PaintRequestList: false,
  Plugin: false,
  PluginArray: false,
  SVGLengthList: false,
  SVGNumberList: false,
  SVGPathSegList: false,
  SVGPointList: false,
  SVGStringList: false,
  SVGTransformList: false,
  SourceBufferList: false,
  StyleSheetList: true,
  // TODO: Not spec compliant, should be false.
  TextTrackCueList: false,
  TextTrackList: false,
  TouchList: false
};
for (collections = getKeys(DOMIterables), i2 = 0; i2 < collections.length; i2++) {
  NAME = collections[i2];
  explicit = DOMIterables[NAME];
  Collection = global3[NAME];
  proto2 = Collection && Collection.prototype;
  if (proto2) {
    if (!proto2[ITERATOR]) hide(proto2, ITERATOR, ArrayValues);
    if (!proto2[TO_STRING_TAG]) hide(proto2, TO_STRING_TAG, NAME);
    Iterators[NAME] = ArrayValues;
    if (explicit) {
      for (key in $iterators) if (!proto2[key]) redefine(proto2, key, $iterators[key], true);
    }
  }
}
var NAME;
var explicit;
var Collection;
var proto2;
var key;
var collections;
var i2;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/parseTweet.js
var import_es6_array6 = __toESM(require_es6_array_iterator());

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.object.to-string.js
var classof = require_classof();
var test = {};
test[require_wks()("toStringTag")] = "z";
if (test + "" != "[object z]") {
  require_redefine()(Object.prototype, "toString", function toString() {
    return "[object " + classof(this) + "]";
  }, true);
}

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.object.keys.js
var toObject2 = require_to_object();
var $keys = require_object_keys();
require_object_sap()("keys", function() {
  return function keys2(it) {
    return $keys(toObject2(it));
  };
});

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/configs.js
var configs_default = {
  version1: {
    version: 1,
    maxWeightedTweetLength: 140,
    scale: 1,
    defaultWeight: 1,
    transformedURLLength: 23,
    ranges: []
  },
  version2: {
    version: 2,
    maxWeightedTweetLength: 280,
    scale: 100,
    defaultWeight: 200,
    transformedURLLength: 23,
    ranges: [{
      start: 0,
      end: 4351,
      weight: 100
    }, {
      start: 8192,
      end: 8205,
      weight: 100
    }, {
      start: 8208,
      end: 8223,
      weight: 100
    }, {
      start: 8242,
      end: 8247,
      weight: 100
    }]
  },
  version3: {
    version: 3,
    maxWeightedTweetLength: 280,
    scale: 100,
    defaultWeight: 200,
    emojiParsingEnabled: true,
    transformedURLLength: 23,
    ranges: [{
      start: 0,
      end: 4351,
      weight: 100
    }, {
      start: 8192,
      end: 8205,
      weight: 100
    }, {
      start: 8208,
      end: 8223,
      weight: 100
    }, {
      start: 8242,
      end: 8247,
      weight: 100
    }]
  },
  defaults: {
    version: 3,
    maxWeightedTweetLength: 280,
    scale: 100,
    defaultWeight: 200,
    emojiParsingEnabled: true,
    transformedURLLength: 23,
    ranges: [{
      start: 0,
      end: 4351,
      weight: 100
    }, {
      start: 8192,
      end: 8205,
      weight: 100
    }, {
      start: 8208,
      end: 8223,
      weight: 100
    }, {
      start: 8242,
      end: 8247,
      weight: 100
    }]
  }
};

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.array.is-array.js
var $export3 = require_export();
$export3($export3.S, "Array", { isArray: require_is_array() });

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/lib/getCharacterWeight.js
var getCharacterWeight = function getCharacterWeight2(ch, options) {
  var defaultWeight = options.defaultWeight, ranges = options.ranges;
  var weight = defaultWeight;
  var chCodePoint = ch.charCodeAt(0);
  if (Array.isArray(ranges)) {
    for (var i3 = 0, length = ranges.length; i3 < length; i3++) {
      var currRange = ranges[i3];
      if (chCodePoint >= currRange.start && chCodePoint <= currRange.end) {
        weight = currRange.weight;
        break;
      }
    }
  }
  return weight;
};
var getCharacterWeight_default = getCharacterWeight;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/regexp/invalidChars.js
var invalidChars = regexSupplant_default(/[#{invalidCharsGroup}]/, {
  invalidCharsGroup: invalidCharsGroup_default
});
var invalidChars_default = invalidChars;

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/hasInvalidCharacters.js
function hasInvalidCharacters_default(text) {
  return invalidChars_default.test(text);
}

// node_modules/.pnpm/core-js@2.6.12/node_modules/core-js/modules/es6.array.sort.js
var $export4 = require_export();
var aFunction = require_a_function();
var toObject3 = require_to_object();
var fails2 = require_fails();
var $sort = [].sort;
var test2 = [1, 2, 3];
$export4($export4.P + $export4.F * (fails2(function() {
  test2.sort(void 0);
}) || !fails2(function() {
  test2.sort(null);
}) || !require_strict_method()($sort)), "Array", {
  // 22.1.3.25 Array.prototype.sort(comparefn)
  sort: function sort(comparefn) {
    return comparefn === void 0 ? $sort.call(toObject3(this)) : $sort.call(toObject3(this), aFunction(comparefn));
  }
});

// node_modules/.pnpm/twitter-text@3.1.0/node_modules/twitter-text/dist/esm/parseTweet.js
var import_twemoji_parser = __toESM(require_dist());
var parseTweet = function parseTweet2() {
  var text = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : configs_default.defaults;
  var mergedOptions = Object.keys(options).length ? options : configs_default.defaults;
  var defaultWeight = mergedOptions.defaultWeight, emojiParsingEnabled = mergedOptions.emojiParsingEnabled, scale = mergedOptions.scale, maxWeightedTweetLength = mergedOptions.maxWeightedTweetLength, transformedURLLength = mergedOptions.transformedURLLength;
  var normalizedText = typeof String.prototype.normalize === "function" ? text.normalize() : text;
  var urlEntitiesMap = transformEntitiesToHash(extractUrlsWithIndices_default(normalizedText));
  var emojiEntitiesMap = emojiParsingEnabled ? transformEntitiesToHash((0, import_twemoji_parser.parse)(normalizedText)) : [];
  var tweetLength = normalizedText.length;
  var weightedLength = 0;
  var validDisplayIndex = 0;
  var valid = true;
  for (var charIndex = 0; charIndex < tweetLength; charIndex++) {
    if (urlEntitiesMap[charIndex]) {
      var _urlEntitiesMap$charI = urlEntitiesMap[charIndex], url = _urlEntitiesMap$charI.url, indices = _urlEntitiesMap$charI.indices;
      weightedLength += transformedURLLength * scale;
      charIndex += url.length - 1;
    } else if (emojiParsingEnabled && emojiEntitiesMap[charIndex]) {
      var _emojiEntitiesMap$cha = emojiEntitiesMap[charIndex], emoji = _emojiEntitiesMap$cha.text, _indices = _emojiEntitiesMap$cha.indices;
      weightedLength += defaultWeight;
      charIndex += emoji.length - 1;
    } else {
      charIndex += isSurrogatePair(normalizedText, charIndex) ? 1 : 0;
      weightedLength += getCharacterWeight_default(normalizedText.charAt(charIndex), mergedOptions);
    }
    if (valid) {
      valid = !hasInvalidCharacters_default(normalizedText.substring(charIndex, charIndex + 1));
    }
    if (valid && weightedLength <= maxWeightedTweetLength * scale) {
      validDisplayIndex = charIndex;
    }
  }
  weightedLength = weightedLength / scale;
  valid = valid && weightedLength > 0 && weightedLength <= maxWeightedTweetLength;
  var permillage = Math.floor(weightedLength / maxWeightedTweetLength * 1e3);
  var normalizationOffset = text.length - normalizedText.length;
  validDisplayIndex += normalizationOffset;
  return {
    weightedLength,
    valid,
    permillage,
    validRangeStart: 0,
    validRangeEnd: validDisplayIndex,
    displayRangeStart: 0,
    displayRangeEnd: text.length > 0 ? text.length - 1 : 0
  };
};
var transformEntitiesToHash = function transformEntitiesToHash2(entities) {
  return entities.reduce(function(map, entity) {
    map[entity.indices[0]] = entity;
    return map;
  }, {});
};
var isSurrogatePair = function isSurrogatePair2(text, cIndex) {
  if (cIndex < text.length - 1) {
    var c = text.charCodeAt(cIndex);
    var cNext = text.charCodeAt(cIndex + 1);
    return 55296 <= c && c <= 56319 && 56320 <= cNext && cNext <= 57343;
  }
  return false;
};
var parseTweet_default = parseTweet;

// node_modules/.pnpm/unicode-segmenter@0.17.0/node_modules/unicode-segmenter/core.js
function decodeUnicodeData(data, cats = "") {
  let buf = (
    /** @type {Array<CategorizedUnicodeRange<T>>} */
    []
  ), len = data.length, i3 = 0, j = 0, p = -1;
  let read = () => {
    let n2 = 0, shift = 0, d2;
    do {
      d2 = parseInt(data[i3++], 36);
      n2 += (d2 & 15) << shift;
      shift += 4;
    } while (d2 & 16);
    return n2;
  };
  while (i3 < len) {
    let from = p + 1 + read();
    p = from + read();
    buf.push([
      from,
      p,
      /** @type {T} */
      cats ? parseInt(cats[j++], 36) : 0
    ]);
  }
  return buf;
}
function findUnicodeRangeCategory(cp, starts, ends) {
  let lo = 0, hi = starts.length - 1;
  while (lo <= hi) {
    let mid = lo + hi >>> 1, end = ends[mid];
    if (cp < starts[mid]) hi = mid - 1;
    else if (cp > end >>> 5) lo = mid + 1;
    else return end & 31;
  }
  return 0;
}

// node_modules/.pnpm/unicode-segmenter@0.17.0/node_modules/unicode-segmenter/_grapheme_data.js
var grapheme_data = (
  /** @type {UnicodeDataEncoding} */
  "090001000h1v5g2903000hl2v6jh16ng1s210111110o35aa10u2k1g10l6600152113h2010u1q1r5aq3890o13181214r22k3158q2n1000v100h1k20000001207030001160721k171001h1j11610332010010321210090411021c1c02100o301201412230u1130b100h1j116111420120411001100k11l10051001h1j11611142011000321210072411021d0g10r3000000132120090o200200g1j11f2012031213711271t1001o301001000001121371b1f0c101h1l2011001031212000080a1t1001m40400102101600i11t301006c7i601008b6p41r10101041h3d0004115a1j290p3q223000511010100g1501010302003172030c0010016000e0i6v50n40n5tl12ir33s12t11u11cj30100060700010a90t220000l71i20m7203010241000502rd101004k300000006101027050920g3t22bk1300616g209030207u18c1000t10003010501b2o20000102000004g37070101o921c000640602001mcv3rg20000001o16d0c0m1fg6g2h30m10q55f1vm11c0ma0p1a42nc0ne1a090q3314902021204020112030318250105bb1201110i1021i15101131502141b15120511011k1155132040202510201010603060a1f02040104210b1g3290e0e0kn11vs12j11j3040pp12t80g6v1vmo7319g21g51gh103040n11010040j51i3f01q1h1d0m27p1a0000cs13200523j200010301010100v140018a4q2501010101c08000i1f12601011g3012215110u1a0001015000pcq181000100011000iji5fvc0u91g5bhg20ie0l94lo6002115303121s12240la1tj23h44tj11t45m4ah33q700000l3ep2021a200t220301012040a0i320j2040007f00100r20c100g3208000011531000s520201036020t900207l1101n311000000321210090a12634b910201l22001051020120011020000e1i520701020000n10h5001050000010000010001re0010323010001r11i520701000001q6000000107l600000230004gg12080001lc62027111n1000411230000000000t820321030030r10090n205001380800501020n2050c0001mc00002000000nc006150000i5l1100600010001q753011160000i441111000000rl11019100000c1h201043102n10ltk1f006eoss2b0202gs94r36si2033ku101m373h50b1rqs4113sli1t22m1uh2435070726u13k92rr7m34h380e0m141egl561g1261114k60ga6nn10t33sv13uf1jf0207150qt16t66pr60n23k6bf1f0e1l29g71c1e029j1n30p11ea0k1028139m16rb2v621122i52213040tf1u3b51n17127c0232041d120819052c28220104060306l5g3l4572g130152cqdl2c3o37a5o27u11c32d9m2cu2191obo57eh9gg1tv3"
);
var grapheme_cats = "262122424333333393233393339333333333393393bf3b3b3b3b3f3f3bffff33b3bb33ff3f33b3b3333333bffff3b33bb33f33bffff33b3bb33ff3f33b3bbb333b3ff33b333f33b3b3b3b3333b3bf33b3bb39333b33b33b3b3b333b333333b3b33333f3b33b3ffb3f3fff3f3b33f35dc33333f3b3b3b33323333b3bb3b33b3fb3b3333b33333bff3b3f33bfb3b3ff3b3b3b3b3b333b333b3323e22442344444444444444444444444444444444444444444444444444444444444444444444444444444443333333333b3b3bb33333b353bff3b3b3b3f3ff3b3b333bfff3f33333fb3bb3fb3b3bb33232333f333fff333333333b3b3333bb3b39393f3b3fbf33bb3b393b3b3b3333b33b33b3bbb33b33ffff3b3333bb3933b3b3b333b3b3b3b3b33b3b3b33b3b3b33b3b33b33b3b3b3fffff3bb39b9b3b33b3bf3f3b33f3b3f93b33b3b3bb33b33b3b3b3333393b3b3b33b39bffb3b332333b333dd3b3333233332333333333333333333333333333444444444444a4444444444444344444444444444444444444444444444444444444444";
var grapheme_pairs = "0001000000010010000000100000000000000000000000000001000000010014000100000001001000010101100101100000000000000000000100000001111000010000000110101001110111111111000100000021001000010000000100100001000000011010000100000001111000013000000100140001000000010010";

// node_modules/.pnpm/unicode-segmenter@0.17.0/node_modules/unicode-segmenter/grapheme.js
var BMP_MAX = 65535;
var T1_MIN = 40960;
var T2_MIN = 126976;
var T0 = new Uint8Array(12288);
var T1 = new Uint8Array(3072);
var T22 = new Uint8Array(2816);
var TAIL_S;
var TAIL_E;
{
  let fill = (t, lo, from, to, cat2) => {
    let hi = lo + t.length - 1;
    for (let cp = from < lo ? lo : from, top = to > hi ? hi : to; cp <= top; cp++) {
      t[cp - lo] = cat2;
    }
  };
  let starts = new Uint32Array(320), ends = new Uint32Array(320), n2 = 0;
  for (let [from, to, cat2] of decodeUnicodeData(grapheme_data, grapheme_cats)) {
    fill(T0, 0, from, to, cat2);
    fill(T1, T1_MIN, from, to, cat2);
    fill(T22, T2_MIN, from, to, cat2);
    if (to >= 65040 && !(from >= T2_MIN && to <= 129791)) {
      starts[n2] = from;
      ends[n2++] = to << 5 | cat2;
    }
  }
  TAIL_S = starts.slice(0, n2);
  TAIL_E = ends.slice(0, n2);
}
function cat(cp) {
  if (cp < 12288) return T0[cp];
  if (cp < T1_MIN) {
    if (cp < 12336) return cp >= 12330 ? 3 : 0;
    if (cp < 12443) {
      if (cp === 12336 || cp === 12349) return 4;
      return cp >= 12441 ? 3 : 0;
    }
    return cp === 12951 || cp === 12953 ? 4 : 0;
  }
  if (cp < 44032) return T1[cp - T1_MIN];
  if (cp < 55204) return (cp - 44032) % 28 ? 8 : 7;
  if (cp < 57344) {
    if (cp <= 55238) return cp >= 55216 ? 13 : 0;
    return cp >= 55243 && cp <= 55291 ? 12 : 0;
  }
  if (cp < 65024) return cp === 64286 ? 3 : 0;
  if (cp < 65040) return 3;
  if (cp >= T2_MIN && cp < 129792) return T22[cp - T2_MIN];
  if (cp >= 917504) {
    if (cp > 921599) return 0;
    return cp >= 917536 && cp < 917632 || cp >= 917760 && cp < 918e3 ? 3 : 2;
  }
  return findUnicodeRangeCategory(cp, TAIL_S, TAIL_E);
}
var PAIR = Uint8Array.from(grapheme_pairs, Number);
function isLinker(cp) {
  return cp === 2381 || cp === 2509 || cp === 2637 || cp === 2765 || cp === 2893 || cp === 3149 || cp === 3405 || cp === 4153 || cp === 6098 || cp === 6752 || cp === 6980 || cp === 7083 || cp === 43456 || cp === 43766 || cp === 68159 || cp === 69939 || cp === 70608 || cp === 71998 || cp === 72263 || cp === 72345 || cp === 73538;
}
function nextState3(st, c, cp) {
  switch (c) {
    // Extend; keeps picto bits, advances InCB run
    case 3:
      if (st & 24) {
        if (cp === 8204) return st & 6;
        if ((st & 24) === 16 || isLinker(cp)) return st & 6 | 16;
        return st & 6 | 8;
      }
      return st & 6;
    // Extended_Pictographic
    case 4:
      return 2;
    // Regional_Indicator; toggles parity
    case 10:
      return st & 1 ^ 1;
    // ZWJ; captures the picto bit, advances InCB run
    case 14:
      return (st & 2) << 1 | st & 24;
    // InCB=Consonant (15); callers never pass other categories
    default:
      return 8;
  }
}
function* graphemeSegments(input) {
  let len = input.length;
  if (len === 0) return;
  let cp = (
    /** @type {number} */
    input.codePointAt(0)
  );
  let cursor = cp > BMP_MAX ? 2 : 1;
  let catBefore = cat(cp);
  let st = 50200 >> catBefore & 1 ? nextState3(0, catBefore, cp) : 0;
  let index = 0;
  let hd = cp;
  let catBegin = catBefore;
  while (cursor < len) {
    cp = /** @type {number} */
    input.codePointAt(cursor);
    let wide = cp > BMP_MAX ? 2 : 1;
    let catAfter = cat(cp);
    let d2 = PAIR[catBefore << 4 | catAfter];
    let boundary;
    if (d2 === 0) boundary = true;
    else if (d2 === 1) boundary = false;
    else if (d2 === 2) boundary = !(st & 1);
    else if (d2 === 3) boundary = !(st & 4);
    else boundary = (st & 24) !== 16;
    st = 50200 >> catAfter & 1 && (st !== 0 || catAfter !== 3) ? nextState3(st, catAfter, cp) : 0;
    if (boundary) {
      yield {
        segment: input.slice(index, cursor),
        index,
        input,
        _hd: hd,
        _catBegin: (
          /** @type {GraphemeCategoryNum} */
          catBegin === 15 ? 0 : catBegin
        ),
        _catEnd: (
          /** @type {GraphemeCategoryNum} */
          catBefore === 15 ? 0 : catBefore
        )
      };
      index = cursor;
      hd = cp;
      catBegin = catAfter;
    }
    cursor += wide;
    catBefore = catAfter;
  }
  yield {
    segment: input.slice(index),
    index,
    input,
    _hd: hd,
    _catBegin: (
      /** @type {GraphemeCategoryNum} */
      catBegin === 15 ? 0 : catBegin
    ),
    _catEnd: (
      /** @type {GraphemeCategoryNum} */
      catBefore === 15 ? 0 : catBefore
    )
  };
}
{
  let keep = graphemeSegments("_");
  PAIR._keep = [keep, keep.next()];
}

// src/textAnalysis.ts
function analyzeTweetText(text) {
  const normalizedText = text.normalize("NFC");
  const parsed = parseTweet_default(normalizedText);
  const urls = extractUrlsWithIndices_default(normalizedText);
  const urlAt = new Map(urls.map((url) => [url.indices[0], url]));
  const boundaries = [];
  let weightedLength = 0;
  let skipUntil = 0;
  for (const part of graphemeSegments(normalizedText)) {
    if (part.index < skipUntil) continue;
    const url = urlAt.get(part.index);
    if (url) {
      weightedLength += 23;
      skipUntil = url.indices[1];
      boundaries.push({ index: skipUntil, weightedLength });
      continue;
    }
    weightedLength += parseTweet_default(part.segment).weightedLength;
    boundaries.push({
      index: part.index + part.segment.length,
      weightedLength
    });
  }
  return {
    normalizedText,
    weightedLength: parsed.weightedLength,
    valid: parsed.valid,
    boundaries
  };
}

// src/tweet.ts
var MAX_TWEET_LENGTH = 280;
var THREAD_START = "THREAD START";
var THREAD_END = "THREAD END";
function parseThread(text) {
  const lines = text.split(/\r\n|\n|\r/);
  const structuralLines = linesOutsideFencedCode(lines);
  const startIndex = lines.findIndex(
    (line, index) => structuralLines[index] && isStructuralLine(line, THREAD_START)
  );
  const endIndex = lines.findIndex(
    (line, index) => structuralLines[index] && isStructuralLine(line, THREAD_END)
  );
  if (startIndex === -1) {
    throw new Error("Thread is missing a THREAD START marker.");
  }
  if (endIndex === -1) {
    throw new Error("Thread is missing a THREAD END marker.");
  }
  if (endIndex < startIndex) {
    throw new Error("THREAD END appears before THREAD START.");
  }
  const segments = [[]];
  for (let index = startIndex + 1; index < endIndex; index++) {
    const line = lines[index];
    if (structuralLines[index] && isStructuralLine(line, "---")) {
      segments.push([]);
    } else {
      segments[segments.length - 1].push(line);
    }
  }
  const normalized = segments.map(trimStructuralBlankLines);
  if (normalized.length === 1 && normalized[0].length === 0) {
    throw new Error("Thread is empty. Add content between the thread markers.");
  }
  return normalized.map((linesInTweet, index) => {
    if (linesInTweet.length === 0) {
      throw new Error(
        `Tweet ${index + 1} is empty. Add content between thread separators.`
      );
    }
    return linesInTweet.join("\n");
  });
}
function isStructuralLine(line, structure) {
  const leadingSpaces = /^ */.exec(line)?.[0].length ?? 0;
  if (leadingSpaces > 3) return false;
  return line.slice(leadingSpaces).replace(/[ \t]+$/, "") === structure;
}
function linesOutsideFencedCode(lines) {
  const outside = [];
  let fence = null;
  for (const line of lines) {
    outside.push(fence === null);
    if (fence) {
      if (closesFence(line, fence)) fence = null;
    } else {
      fence = opensFence(line);
    }
  }
  return outside;
}
function opensFence(line) {
  const match = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
  if (!match) return null;
  return {
    character: match[1][0],
    length: match[1].length
  };
}
function closesFence(line, fence) {
  const match = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
  return match?.[1][0] === fence.character && match[1].length >= fence.length;
}
function trimStructuralBlankLines(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}
function splitIntoTweets(text, maxLength = MAX_TWEET_LENGTH) {
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    throw new RangeError("Tweet length must be a positive number.");
  }
  const analysis = analyzeTweetText(text);
  const { normalizedText, boundaries } = analysis;
  if (analysis.weightedLength <= maxLength) {
    return normalizedText.trim().length > 0 ? [normalizedText] : [];
  }
  const chunks = [];
  let startIndex = 0;
  let startBoundary = 0;
  let consumedWeight = 0;
  while (startBoundary < boundaries.length) {
    const limit = findLimit(boundaries, startBoundary, consumedWeight, maxLength);
    if (limit === startBoundary) {
      throw new Error("A single URL or grapheme exceeds the tweet length limit.");
    }
    const endBoundary = chooseBreak(
      normalizedText,
      boundaries,
      startBoundary,
      limit,
      startIndex
    );
    const endIndex = boundaries[endBoundary - 1].index;
    const chunk = normalizedText.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) chunks.push(chunk);
    consumedWeight = boundaries[endBoundary - 1].weightedLength;
    startBoundary = endBoundary;
    startIndex = endIndex;
  }
  return chunks;
}
function findLimit(boundaries, start, consumedWeight, maxLength) {
  let end = start;
  while (end < boundaries.length && boundaries[end].weightedLength - consumedWeight <= maxLength) {
    end++;
  }
  return end;
}
function chooseBreak(text, boundaries, start, limit, startIndex) {
  if (limit === boundaries.length) return limit;
  let sentenceBreak = -1;
  let whitespaceBreak = -1;
  for (let index = start; index < limit; index++) {
    const unitStart = index === start ? startIndex : boundaries[index - 1].index;
    const unit = text.slice(unitStart, boundaries[index].index);
    if (/^\s+$/u.test(unit)) whitespaceBreak = index + 1;
    if (/[.?!]$/u.test(unit) && index + 1 < limit) {
      const nextStart = boundaries[index].index;
      const next = text.slice(nextStart, boundaries[index + 1].index);
      if (/^\s+$/u.test(next)) sentenceBreak = index + 1;
    }
  }
  if (sentenceBreak > start) return sentenceBreak;
  return whitespaceBreak > start ? whitespaceBreak : limit;
}

// src/Modals/ComposeTweetModal.ts
var COUNTDOWN_FROM = 30;
var BREAK_RUN = "\n\n\n";
var MAX_MEDIA = 4;
var IMAGE_EXTENSIONS = {
  gif: true,
  jpg: true,
  jpeg: true,
  tif: true,
  tiff: true,
  png: true,
  webp: true,
  bmp: true
};
var EXTENSION_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/tiff": "tiff"
};
function pasteStamp() {
  const now = /* @__PURE__ */ new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
/* ===== 马自立 本地补丁：动效图标 + 过渡。更新插件会丢，要把带「本地补丁」的几处接回去（样式在 styles.css 末尾「本地补丁」一节） =====
 * 图标本体是 Lucide（ISC 许可，和 Obsidian 自带的同一套），动效照 lucide-animated（github.com/pqoqubbw/icons）的路子写成 CSS：
 * 悬停在按钮上时图标自己动一下（箭头顶一下、垃圾桶掀盖、加号转、纸飞机起飞、表针转一圈），勾是画出来的，转圈一直转。
 * 版式变化（加帖、删帖、换顺序、拆帖）都是先量、再改、再用 transform 倒着播回去，不过渡 margin / height */
var NT_ICONS = {
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle class="sun" cx="9" cy="9" r="2"/><path class="hill" d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  "arrow-up": '<g class="nudge-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></g>',
  "arrow-down": '<g class="nudge-down"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></g>',
  trash: '<g class="lid"><path d="M3 6h18"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></g><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  plus: '<g class="turn"><path d="M5 12h14"/><path d="M12 5v14"/></g>',
  send: '<g class="fly"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></g>',
  clock: '<circle cx="12" cy="12" r="10"/><path class="hand" d="M12 6v6l4 2"/>',
  x: '<g class="turn"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></g>',
  check: '<circle class="draw" pathLength="1" cx="12" cy="12" r="10"/><path class="draw late" pathLength="1" d="m9 12 2 2 4-4"/>',
  open: '<g class="nudge-out"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></g>',
  loader: '<path class="spin" d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  reply: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  repost: '<g class="turn"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></g>',
  like: '<path class="beat" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  views: '<path class="bar b1" d="M6 20v-6"/><path class="bar b2" d="M12 20V4"/><path class="bar b3" d="M18 20V10"/>'
};
function ntIcon(parent, name) {
  const el = parent.createSpan({ cls: `nt-ico nt-ico-${name}`, attr: { "aria-hidden": "true" } });
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${NT_ICONS[name]}</svg>`;
  return el;
}
function ntMotion() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
var NT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
var NT_ENTER = [{ opacity: 0, transform: "translateY(10px) scale(0.98)" }, { opacity: 1, transform: "none" }];
/* 本地补丁：光标所在的块。在列表里 = 这一项连同它的子项；不在列表里 = 所在的段落（连着的非空行）。
 * 转成推文正文：去掉第一行的列表符号、任务框、TODOseq 关键词、标题井号；子项保留「- / 1.」去掉缩进；
 * [[链接|别名]] 留别名，[[链接]] 留文件名，[文字](网址) 写成「文字 网址」，粗体 / 高亮 / 删除线记号、%%注释%%、块 id 去掉；
 * 嵌入的图片 ![[x.png]] 抽出来当附件 */
var NT_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+/;
var NT_KEYWORD = /^(?:TODO|DOING|DONE|LATER|NOW|IN-PROGRESS|WAITING|WAIT|PAUSED|SUSPENDED|CANCELLED|CANCELED|FAILED|TODOFORAI|TODO4AI|TODO2AI|TODOTOAI|TOREVIEW|NEEDOK|ERRORED|HITLIMIT|QUEUED|DELEGATED)\s+/;
function ntIndent(line) {
  return line.match(/^\s*/)[0].replace(/\t/g, "    ").length;
}
function blockAtCursor(editor) {
  const at = editor.getCursor().line;
  const line = (n) => editor.getLine(n);
  const blank = (n) => line(n).trim() === "";
  if (blank(at)) return null;
  let start = -1;
  for (let n = at; n >= 0 && !blank(n); n--) {
    if (NT_ITEM.test(line(n)) && (n === at || ntIndent(line(n)) < ntIndent(line(at)))) {
      start = n;
      break;
    }
  }
  let end;
  if (start >= 0) {
    const base = ntIndent(line(start));
    end = start;
    while (end + 1 < editor.lineCount() && !blank(end + 1) && ntIndent(line(end + 1)) > base) end++;
  } else {
    start = end = at;
    while (start > 0 && !blank(start - 1) && !NT_ITEM.test(line(start - 1))) start--;
    while (end + 1 < editor.lineCount() && !blank(end + 1) && !NT_ITEM.test(line(end + 1))) end++;
  }
  const raw = [];
  for (let n = start; n <= end; n++) raw.push(line(n));
  const images = [];
  const text = raw.map((source, index) => {
    const [, marker = "", body] = source.trim().match(/^((?:[-*+]|\d+[.)])\s+)?(?:\[.\]\s+)?(.*)$/);
    const cleaned = body.replace(/^#{1,6}\s+/, "").replace(NT_KEYWORD, "").replace(/!\[\[([^\]|#]+)[^\]]*]]/g, (_, link) => {
      images.push(link);
      return "";
    }).replace(/\[\[[^\]|]+\|([^\]]+)]]/g, "$1").replace(/\[\[([^\]#]+)(?:#[^\]]*)?]]/g, (_, link) => link.split("/").pop()).replace(/\[([^\]]+)]\((https?:[^)\s]+)\)/g, "$1 $2").replace(/%%.*?%%/g, "").replace(/\*\*|__|==|~~/g, "").replace(/\s\^[\w-]+\s*$/, "").trim();
    if (!cleaned) return null;
    return index === 0 ? cleaned : marker.replace(/^[*+]/, "-") + cleaned;
  }).filter((value) => value !== null).join("\n");
  if (!text && images.length === 0) return null;
  return { text, images, firstLine: raw[0] };
}
/* 本地补丁：界面音。Web Audio 现合成，不带音频文件；音色照库里看板那套（往前走的往上、撤回的往下），
 * 压在低音区、短、轻（总音量 0.10），设置里「Sound effects」能关 */
var ntSoundOn = true;
var NT_VOLUME = 0.1;
var NT_SOUNDS = {
  add: { type: "triangle", notes: [[523, 0.05], [659, 0.08]] },
  remove: { type: "triangle", notes: [[440, 0.05], [349, 0.1]] },
  move: { type: "triangle", notes: [[587, 0.05]] },
  split: { type: "triangle", notes: [[494, 0.04], [587, 0.04], [698, 0.08]], vol: 0.8 },
  attach: { type: "sine", notes: [[587, 0.05], [784, 0.09]] },
  detach: { type: "sine", notes: [[523, 0.05], [392, 0.09]] },
  over: { type: "triangle", notes: [[220, 0.08], [175, 0.14]], vol: 1.2 },
  mode: { type: "sine", notes: [[659, 0.04]], vol: 0.7 },
  toggle: { type: "triangle", notes: [[523, 0.05]] },
  send: { type: "sine", notes: [[392, 0.04], [523, 0.05], [698, 0.1]], vol: 0.8 },
  schedule: { type: "sine", notes: [[440, 0.07], [440, 0.1]] },
  posted: { type: "sine", notes: [[392, 0.09], [523, 0.22]], vol: 0.85, attack: 0.03 },
  failed: { type: "triangle", notes: [[196, 0.1], [147, 0.2]], vol: 1.2 },
  deleted: { type: "triangle", notes: [[330, 0.08], [247, 0.16]] }
};
function ntSound(name) {
  if (!ntSoundOn) return;
  const spec = NT_SOUNDS[name];
  if (!spec) return;
  try {
    const ctx = window.__ntAudio = window.__ntAudio ?? new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    let at = ctx.currentTime;
    const volume = NT_VOLUME * (spec.vol ?? 1);
    for (const [frequency, duration] of spec.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(volume, at + (spec.attack ?? 0.012));
      gain.gain.exponentialRampToValueAtTime(1e-4, at + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + duration + 0.02);
      at += duration * 0.85;
    }
  } catch (error) {
    console.error("[NoteTweet] sound", error);
  }
}
var NT_SHAKE = [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "translateX(1px)" }, { transform: "none" }];
var ImagePickerModal = class extends import_obsidian3.FuzzySuggestModal {
  constructor(app, files, onPick) {
    super(app);
    this.files = files;
    this.onPick = onPick;
    this.setPlaceholder("Attach an image from your vault\u2026");
  }
  getItems() {
    return this.files;
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onPick(file);
  }
};
var ComposeTweetModal = class _ComposeTweetModal extends import_obsidian3.Modal {
  constructor(app, options, resolve) {
    super(app);
    this.options = options;
    this.resolve = resolve;
    this.rows = [];
    this.scheduleButton = null;
    this.selectedAccountId = "";
    this.submitted = false;
    this.result = null;
  }
  static compose(app, options = {}) {
    const { promise, resolve } = deferred();
    new _ComposeTweetModal(app, options, resolve).open();
    return promise;
  }
  get autoSplit() {
    return this.options.autoSplit ?? true;
  }
  buildAccountPicker(root) {
    const accounts = this.options.accounts ?? [];
    if (this.options.submitLabel === "Update") return;
    const picker = root.createDiv({ cls: "nt-account-picker" });
    picker.createEl("label", { text: "Post from", attr: { for: "nt-account" } });
    if (accounts.length === 0) {
      picker.createSpan({
        cls: "nt-account-empty",
        text: "Add an X account in settings"
      });
      return;
    }
    const selected = accounts.some(
      ({ id }) => id === this.options.selectedAccountId
    ) ? this.options.selectedAccountId : accounts[0].id;
    this.selectedAccountId = selected ?? "";
    const avatar = picker.createSpan({ cls: "nt-avatar", attr: { "aria-hidden": "true" } });
    const paintAvatar = () => avatar.setText(
      (accounts.find(({ id }) => id === this.selectedAccountId)?.name ?? "?").charAt(0).toUpperCase()
    );
    paintAvatar();
    const select = picker.createEl("select", {
      cls: "nt-account-select dropdown",
      attr: { id: "nt-account", "aria-label": "X account" }
    });
    for (const account of accounts) {
      select.createEl("option", { text: account.name, value: account.id });
    }
    select.value = this.selectedAccountId;
    select.addEventListener("change", () => {
      this.selectedAccountId = select.value;
      paintAvatar();
      if (ntMotion()) avatar.animate([{ transform: "scale(0.6)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
      this.refreshState();
    });
  }
  onOpen() {
    this.modalEl.addClass("nt-compose-modal");
    this.contentEl.addClass("postTweetModal");
    this.setTitle(
      this.options.submitLabel === "Update" ? "Edit scheduled post" : "Compose post"
    );
    const head = this.contentEl.createDiv({ cls: "nt-head" });
    this.buildAccountPicker(head);
    this.buildModeSwitch(head);
    this.thread = this.contentEl.createDiv({ cls: "nt-thread" });
    try {
      this.seedContent();
    } catch (error) {
      log.warning(String(error));
      this.close();
      return;
    }
    this.previewEl = this.contentEl.createDiv({ cls: "nt-preview" });
    this.buildAddButton(this.contentEl);
    this.buildFooter(this.contentEl);
    this.refreshState();
    if (ntMotion()) {
      this.rows.forEach((row, index) => row.el.animate(NT_ENTER, {
        duration: 320,
        easing: NT_EASE,
        delay: 40 + Math.min(index, 6) * 45,
        fill: "backwards"
      }));
    }
  }
  /** 本地补丁：先量、再改、再把挪了位置的帖子 / 按钮 / 底栏倒着播回来；新出现的帖子淡入 */
  flip(mutate) {
    const els = () => [...this.rows.map((row) => row.el), this.addEl, this.footerEl];
    const before = new Map(els().map((el) => [el, el.getBoundingClientRect()]));
    const result = mutate();
    if (!ntMotion()) return result;
    for (const el of els()) {
      const was = before.get(el);
      if (!was) {
        el.animate(NT_ENTER, { duration: 300, easing: NT_EASE });
        continue;
      }
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 340, easing: NT_EASE });
    }
    return result;
  }
  /** 本地补丁：删掉的帖子留一个影子在原地淡出去 */
  ghost(row) {
    if (!ntMotion()) return;
    const at = row.el.getBoundingClientRect();
    const base = this.thread.getBoundingClientRect();
    const ghost = row.el.cloneNode(true);
    ghost.querySelector("textarea").value = row.textarea.value;
    ghost.addClass("nt-ghost");
    ghost.setCssStyles({ top: `${at.top - base.top}px`, left: `${at.left - base.left}px`, width: `${at.width}px` });
    this.thread.appendChild(ghost);
    ghost.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-12px) scale(0.96)" }],
      { duration: 220, easing: "ease-in", fill: "forwards" }
    ).finished.then(() => ghost.remove(), () => ghost.remove());
  }
  seedContent() {
    const first = this.makeRow();
    if (this.options.initialContent?.length) {
      this.fillPosts(this.options.initialContent, first);
    } else if (this.options.initialText) {
      const chunks = this.autoSplit ? splitIntoTweets(this.options.initialText) : [this.options.initialText];
      this.fillPosts(chunks, first);
    }
    if (this.options.initialAttachments?.length) {
      first.attachments = [...this.options.initialAttachments];
      this.renderAttachments(first);
    }
    this.rows[0]?.textarea.focus();
  }
  fillPosts(chunks, first) {
    for (const chunk of chunks) {
      const target = first.textarea.value.trim() === "" ? first : this.makeRow();
      target.textarea.value = chunk;
      this.update(target);
    }
  }
  /** Build one post card and insert it at `atIndex` (default: append). */
  makeRow(value = "", atIndex = this.rows.length) {
    const el = this.thread.createDiv({ cls: "nt-post" });
    const rail = el.createDiv({ cls: "nt-rail" });
    const node = rail.createDiv({ cls: "nt-node" });
    const body = el.createDiv({ cls: "nt-body" });
    const card = body.createDiv({ cls: "nt-card" });
    const editor = card.createDiv({ cls: "nt-editor" });
    const textarea = editor.createEl("textarea", {
      cls: "tweetArea",
      attr: { placeholder: "What do you want to say?", rows: "1" }
    });
    textarea.value = value;
    const count = editor.createDiv({ cls: "nt-count" });
    const countNum = count.createSpan({ cls: "nt-count-num" });
    count.createSpan({ cls: "nt-ring" });
    const attachEl = card.createDiv({ cls: "nt-attachments" });
    const controls = card.createDiv({ cls: "nt-controls" });
    const attach = this.iconButton(controls, "image", "Attach image");
    const moveUp = this.iconButton(controls, "arrow-up", "Move up");
    const moveDown = this.iconButton(controls, "arrow-down", "Move down");
    const remove = this.iconButton(controls, "trash", "Delete post", true);
    const row = {
      el,
      node,
      card,
      textarea,
      count,
      countNum,
      attachEl,
      attachments: [],
      moveUp,
      moveDown,
      remove
    };
    if (atIndex < this.rows.length) {
      this.thread.insertBefore(el, this.rows[atIndex].el);
      this.rows.splice(atIndex, 0, row);
    } else {
      this.rows.push(row);
    }
    textarea.addEventListener("input", () => {
      if (this.splitOnBlankLines(row)) return;
      this.update(row);
      this.refreshState();
    });
    textarea.addEventListener("focus", () => this.setActive(row));
    textarea.addEventListener(
      "keydown",
      (event) => this.handleKeydown(event, row)
    );
    textarea.addEventListener("paste", (event) => this.handlePaste(event, row));
    attach.addEventListener("click", () => this.pickImage(row));
    moveUp.addEventListener("click", () => this.moveRow(row, -1));
    moveDown.addEventListener("click", () => this.moveRow(row, 1));
    remove.addEventListener("click", () => this.deleteRow(row));
    this.update(row);
    return row;
  }
  iconButton(parent, icon, label, danger = false) {
    const button = parent.createEl("button", {
      cls: danger ? "nt-icon-btn nt-danger" : "nt-icon-btn",
      attr: { type: "button", "aria-label": label, title: label }
    });
    ntIcon(button, icon);
    return button;
  }
  /** 本地补丁：Write / Preview 两档，Preview 照 X（和 Typefully 的预览栏）的样子把整串帖子排出来 */
  buildModeSwitch(root) {
    const tabs = root.createDiv({ cls: "nt-mode", attr: { role: "tablist" } });
    tabs.createSpan({ cls: "nt-mode-pill" });
    const make = (label, preview) => {
      const button = tabs.createEl("button", {
        cls: "nt-mode-btn",
        text: label,
        attr: { type: "button", role: "tab" }
      });
      button.addEventListener("click", () => this.setPreview(preview));
      return button;
    };
    this.modeButtons = [make("Write", false), make("Preview", true)];
    this.previewing = false;
    this.modeButtons[0].addClass("is-on");
  }
  setPreview(on) {
    if (this.previewing === on) return;
    this.previewing = on;
    ntSound("mode");
    this.contentEl.toggleClass("is-preview", on);
    this.modeButtons.forEach((button, index) => button.toggleClass("is-on", index === (on ? 1 : 0)));
    if (on) {
      this.renderPreview();
    } else {
      if (ntMotion()) this.rows.forEach((row, index) => row.el.animate(NT_ENTER, { duration: 260, easing: NT_EASE, delay: Math.min(index, 6) * 35, fill: "backwards" }));
      (this.rows.find((row) => row.el.hasClass("is-active")) ?? this.rows[0])?.textarea.focus();
    }
  }
  renderPreview() {
    const root = this.previewEl;
    root.empty();
    const name = (this.options.accounts ?? []).find(({ id }) => id === this.selectedAccountId)?.name ?? "You";
    const posts = this.rows.filter((row) => !this.isEmpty(row));
    if (posts.length === 0) {
      root.createDiv({ cls: "nt-tw-empty", text: "Nothing to preview yet." });
      return;
    }
    posts.forEach((row, index) => {
      const post = root.createDiv({ cls: "nt-tw" });
      post.style.setProperty("--i", String(index));
      post.createDiv({ cls: "nt-tw-side" }).createSpan({ cls: "nt-avatar", text: name.charAt(0).toUpperCase() });
      const main = post.createDiv({ cls: "nt-tw-main" });
      const meta = main.createDiv({ cls: "nt-tw-meta" });
      meta.createSpan({ cls: "nt-tw-name", text: name });
      meta.createSpan({ cls: "nt-tw-handle", text: `@${name} \xB7 now` });
      if (posts.length > 1) meta.createSpan({ cls: "nt-tw-index", text: `${index + 1}/${posts.length}` });
      if (row.textarea.value.trim()) this.richText(main.createDiv({ cls: "nt-tw-text" }), row.textarea.value);
      if (row.attachments.length > 0) {
        const media = main.createDiv({ cls: `nt-tw-media is-${row.attachments.length}` });
        for (const file of row.attachments) {
          media.createEl("img", { attr: { src: this.app.vault.getResourcePath(file), alt: file.name } });
        }
      }
      const actions = main.createDiv({ cls: "nt-tw-actions" });
      for (const icon of ["reply", "repost", "like", "views"]) ntIcon(actions.createSpan({ cls: "nt-tw-act" }), icon);
    });
  }
  /** 链接、#话题、@提及 按 X 的样子上色 */
  richText(el, text) {
    let last = 0;
    for (const match of text.matchAll(/https?:\/\/\S+|[#＃][\p{L}\p{N}_]+|@\w{1,15}/gu)) {
      el.appendText(text.slice(last, match.index));
      el.createSpan({ cls: "nt-tw-link", text: match[0] });
      last = match.index + match[0].length;
    }
    el.appendText(text.slice(last));
  }
  buildAddButton(root) {
    const add = root.createEl("button", {
      cls: "nt-add",
      attr: { type: "button" }
    });
    ntIcon(add.createSpan({ cls: "nt-add-icon" }), "plus");
    add.createSpan({ text: "Add post" });
    add.addEventListener("click", () => this.appendRow());
    this.addEl = add;
  }
  buildFooter(root) {
    const footer = root.createDiv({ cls: "nt-footer" });
    this.footerEl = footer;
    const context = footer.createDiv({ cls: "nt-footer-context" });
    this.statusEl = context.createDiv({ cls: "nt-footer-status" });
    if (this.options.allowSchedule) {
      context.createDiv({
        cls: "nt-scheduler-identity",
        text: "Scheduled posts use the scheduler's posting identity."
      });
    }
    const actions = footer.createDiv({ cls: "nt-footer-actions" });
    if (this.options.allowSchedule) {
      this.scheduleButton = actions.createEl("button", {
        cls: "nt-btn nt-btn-ghost",
        attr: { type: "button" }
      });
      ntIcon(this.scheduleButton, "clock");
      this.scheduleButton.createSpan({ text: "Schedule" });
      this.scheduleButton.addEventListener(
        "click",
        () => void this.submitSchedule()
      );
    }
    this.postButton = actions.createEl("button", {
      cls: "nt-btn nt-btn-cta mod-cta",
      attr: { type: "button" }
    });
    ntIcon(this.postButton, this.options.submitLabel === "Update" ? "check" : "send");
    this.postButton.createSpan({ text: this.options.submitLabel ?? "Post" });
    this.postButton.addEventListener("click", () => this.submitPost());
  }
  pickImage(row) {
    if (row.attachments.length >= MAX_MEDIA) {
      log.warning(`A post can hold at most ${MAX_MEDIA} images.`);
      return;
    }
    const images = this.app.vault.getFiles().filter((file) => IMAGE_EXTENSIONS[file.extension.toLowerCase()] === true).filter((file) => !row.attachments.includes(file));
    if (images.length === 0) {
      log.warning("No image files found in your vault.");
      return;
    }
    new ImagePickerModal(this.app, images, (file) => {
      ntSound("attach");
      row.attachments.push(file);
      this.renderAttachments(row);
      this.refreshState();
      row.textarea.focus();
    }).open();
  }
  renderAttachments(row) {
    const shown = new Set(row.shown ?? []);
    row.shown = [...row.attachments];
    row.attachEl.empty();
    for (const file of row.attachments) {
      const chip = row.attachEl.createDiv({ cls: shown.has(file) ? "nt-attachment" : "nt-attachment is-new" });
      chip.createEl("img", {
        attr: { src: this.app.vault.getResourcePath(file), alt: file.name }
      });
      const remove = chip.createEl("button", {
        cls: "nt-attachment-remove",
        attr: { type: "button", "aria-label": `Remove ${file.name}` }
      });
      ntIcon(remove, "x");
      remove.addEventListener("click", () => {
        ntSound("detach");
        row.attachments = row.attachments.filter((item) => item !== file);
        this.renderAttachments(row);
        this.refreshState();
      });
    }
  }
  setActive(row) {
    for (const other of this.rows) {
      other.el.toggleClass("is-active", other === row);
    }
  }
  /** Repaint one row's X-weighted character count. */
  update(row) {
    const length = analyzeTweetText(row.textarea.value).weightedLength;
    const remaining = MAX_TWEET_LENGTH - length;
    const shown = remaining <= COUNTDOWN_FROM;
    const over = this.autoSplit && length > MAX_TWEET_LENGTH;
    const wasOver = row.el.hasClass("is-over");
    row.count.style.setProperty("--nt-p", String(Math.min(length / MAX_TWEET_LENGTH, 1)));
    row.count.toggleClass("is-empty", length === 0);
    row.count.toggleClass("is-shown", shown);
    row.count.toggleClass("is-over", over);
    row.el.toggleClass("is-over", over);
    row.countNum.setText(shown ? String(remaining) : "");
    if (over && !wasOver) {
      ntSound("over");
      if (ntMotion()) row.card.animate(NT_SHAKE, { duration: 360, easing: "ease-out" });
    }
  }
  /**
   * Recompute thread-wide chrome: rail visibility, node numbering, control
   * availability, and the footer validity that gates the actions.
   */
  refreshState() {
    const count = this.rows.length;
    this.thread.toggleClass("is-single", count <= 1);
    this.rows.forEach((row, index) => {
      row.node.setText(String(index + 1));
      row.moveUp.disabled = index === 0;
      row.moveDown.disabled = index === count - 1;
      row.remove.disabled = count === 1 && this.isEmpty(row);
    });
    const { ok, reason } = this.validate();
    this.statusEl.setText(reason ?? "");
    this.statusEl.toggleClass("is-blocked", Boolean(reason));
    const requiresAccount = this.options.submitLabel !== "Update";
    this.postButton.disabled = !ok || requiresAccount && this.selectedAccountId === "";
    if (this.scheduleButton) this.scheduleButton.disabled = !ok;
    if (this.previewing) this.renderPreview();
  }
  handlePaste(event, row) {
    const images = Array.from(event.clipboardData?.files ?? []).filter(
      (file) => file.type.startsWith("image/")
    );
    if (images.length > 0) {
      event.preventDefault();
      void this.attachPastedImages(row, images);
      return;
    }
    if (!this.autoSplit) return;
    const pasted = event.clipboardData?.getData("text") ?? "";
    const start = row.textarea.selectionStart;
    const end = row.textarea.selectionEnd;
    const combined = row.textarea.value.slice(0, start) + pasted + row.textarea.value.slice(end);
    if (analyzeTweetText(combined).weightedLength <= MAX_TWEET_LENGTH) return;
    event.preventDefault();
    this.flip(() => {
      this.replaceRowWithPosts(row, splitIntoTweets(combined));
      this.refreshState();
    });
    ntSound("split");
  }
  replaceRowWithPosts(row, chunks) {
    const index = this.rows.indexOf(row);
    row.textarea.value = chunks[0] ?? "";
    this.update(row);
    for (let offset = 1; offset < chunks.length; offset++) {
      this.makeRow(chunks[offset], index + offset);
    }
  }
  /** Save clipboard images into the vault, then attach them to the post. */
  async attachPastedImages(row, files) {
    for (const file of files) {
      if (row.attachments.length >= MAX_MEDIA) {
        log.warning(`A post can hold at most ${MAX_MEDIA} images.`);
        break;
      }
      const extension = EXTENSION_BY_MIME[file.type];
      if (!extension) {
        log.warning(`Unsupported image type: ${file.type}.`);
        continue;
      }
      try {
        const name = `Pasted image ${pasteStamp()}.${extension}`;
        const path = await this.app.fileManager.getAvailablePathForAttachment(name);
        const saved = await this.app.vault.createBinary(path, await file.arrayBuffer());
        row.attachments.push(saved);
        ntSound("attach");
        this.renderAttachments(row);
        this.refreshState();
      } catch (error) {
        log.error(`Could not save the pasted image: ${String(error)}`);
      }
    }
  }
  handleKeydown(event, row) {
    const index = this.rows.indexOf(row);
    const empty = row.textarea.value.length === 0;
    if (event.code === "Backspace" && empty && this.rows.length > 1) {
      event.preventDefault();
      this.deleteRow(row);
      return;
    }
    const enter = event.code === "Enter" || event.code === "NumpadEnter";
    if (event.code === "Enter" && analyzeTweetText(row.textarea.value).weightedLength >= MAX_TWEET_LENGTH && this.autoSplit || enter && event.altKey) {
      event.preventDefault();
      this.appendRow();
      return;
    }
    if (event.code === "Enter" && event.shiftKey) {
      event.preventDefault();
      this.insertRow(index);
      return;
    }
    if (event.code === "Enter" && event.ctrlKey) {
      event.preventDefault();
      this.insertRow(index + 1);
      return;
    }
    if (event.ctrlKey && !event.shiftKey && event.code === "ArrowUp" && index > 0) {
      this.rows[index - 1].textarea.focus();
      return;
    }
    if (event.ctrlKey && !event.shiftKey && event.code === "ArrowDown" && index < this.rows.length - 1) {
      this.rows[index + 1].textarea.focus();
      return;
    }
    if (event.ctrlKey && event.shiftKey && event.code === "ArrowDown" && index < this.rows.length - 1) {
      event.preventDefault();
      this.swapRows(index, index + 1);
      return;
    }
    if (event.ctrlKey && event.shiftKey && event.code === "ArrowUp" && index > 0) {
      event.preventDefault();
      this.swapRows(index, index - 1);
      return;
    }
    if (event.ctrlKey && event.shiftKey && event.code === "Delete") {
      event.preventDefault();
      this.deleteRow(row);
    }
  }
  /** Split the current post at the first run of blank lines. */
  splitOnBlankLines(row) {
    const value = row.textarea.value;
    const index = value.indexOf(BREAK_RUN);
    if (index === -1) return false;
    const next = this.flip(() => {
      row.textarea.value = value.slice(0, index);
      this.update(row);
      const made = this.makeRow(
        value.slice(index + BREAK_RUN.length),
        this.rows.indexOf(row) + 1
      );
      this.refreshState();
      return made;
    });
    ntSound("split");
    next.textarea.focus();
    next.textarea.setSelectionRange(0, 0);
    return true;
  }
  appendRow() {
    if (this.rows.some((row2) => this.isEmpty(row2))) {
      log.warning("Finish the empty post before adding another.");
      return null;
    }
    const row = this.flip(() => {
      const made = this.makeRow();
      this.refreshState();
      return made;
    });
    ntSound("add");
    row.textarea.focus();
    return row;
  }
  insertRow(index) {
    if (this.rows.some((row2) => this.isEmpty(row2))) {
      log.warning("Finish the empty post before adding another.");
      return;
    }
    const row = this.flip(() => {
      const made = this.makeRow("", index);
      this.refreshState();
      return made;
    });
    ntSound("add");
    row.textarea.focus();
  }
  deleteRow(row) {
    ntSound("remove");
    if (this.rows.length === 1) {
      row.textarea.value = "";
      row.attachments = [];
      this.renderAttachments(row);
      this.update(row);
      this.refreshState();
      return;
    }
    const index = this.rows.indexOf(row);
    this.ghost(row);
    this.flip(() => {
      this.rows.splice(index, 1);
      row.el.remove();
      this.refreshState();
    });
    this.rows[index === 0 ? 0 : index - 1]?.textarea.focus();
  }
  swapRows(a, b) {
    this.flip(() => {
      [this.rows[a], this.rows[b]] = [this.rows[b], this.rows[a]];
      this.thread.insertBefore(
        this.rows[Math.min(a, b)].el,
        this.rows[Math.max(a, b)].el
      );
      this.refreshState();
    });
    ntSound("move");
    this.rows[b].textarea.focus();
  }
  moveRow(row, direction) {
    const index = this.rows.indexOf(row);
    const target = index + direction;
    if (target < 0 || target >= this.rows.length) return;
    this.swapRows(index, target);
  }
  isEmpty(row) {
    return row.textarea.value.length === 0 && row.attachments.length === 0;
  }
  /**
   * Validate the thread. `ok` is true when every post has text or an image and
   * none exceed the limit (when auto-split is on); `reason` explains a block, or
   * is `null` when the thread is simply untouched.
   */
  validate() {
    if (this.rows.every((row) => this.isEmpty(row))) {
      return { ok: false, reason: null };
    }
    if (this.autoSplit && this.rows.some(
      (row) => analyzeTweetText(row.textarea.value).weightedLength > MAX_TWEET_LENGTH
    )) {
      return { ok: false, reason: "A post is over 280 characters" };
    }
    if (this.rows.some((row) => this.isEmpty(row))) {
      return { ok: false, reason: "A post in the thread is empty" };
    }
    return { ok: true, reason: null };
  }
  /** Compose the postable text for each row, appending image links at the end. */
  collectContent() {
    return this.rows.map((row) => {
      const text = row.textarea.value;
      if (row.attachments.length === 0) return text;
      const links = row.attachments.map((file) => `[[${file.path}]]`).join(" ");
      return text.length > 0 ? `${text}
${links}` : links;
    });
  }
  submitPost() {
    const requiresAccount = this.options.submitLabel !== "Update";
    if (this.submitted || !this.validate().ok || requiresAccount && !this.selectedAccountId) return;
    this.result = {
      content: this.collectContent(),
      ...this.selectedAccountId ? { accountId: this.selectedAccountId } : {}
    };
    this.submitted = true;
    ntSound("send");
    this.postButton.addClass("is-sending");
    window.setTimeout(() => {
      if (this.containerEl.isConnected) this.close();
    }, ntMotion() ? 280 : 0);
  }
  async submitSchedule() {
    if (!this.validate().ok) return;
    let postAt;
    try {
      postAt = await promptForDateTime(this.app);
    } catch (error) {
      log.error(String(error));
      return;
    }
    if (postAt === null) return;
    ntSound("schedule");
    this.result = { content: this.collectContent(), postAt };
    this.submitted = true;
    this.close();
  }
  onClose() {
    this.contentEl.empty();
    this.resolve(this.submitted ? this.result : null);
  }
};

// src/Modals/ScheduledTweetsModal.ts
var ScheduledTweetsModal = class extends import_obsidian4.Modal {
  constructor(app, scheduler) {
    super(app);
    this.scheduler = scheduler;
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("postTweetModal");
    let tweets;
    try {
      tweets = await this.scheduler.getScheduledTweets();
    } catch (error) {
      log.error(`Could not load scheduled tweets: ${error}`);
      this.close();
      return;
    }
    this.setTitle(`Scheduled tweets (${tweets.length})`);
    if (tweets.length === 0) {
      contentEl.createEl("p", { text: "No scheduled tweets. Go write some!" });
      return;
    }
    const container = contentEl.createDiv({ cls: "scheduledTweetsContainer" });
    for (const tweet of tweets) this.renderRow(tweet, container);
  }
  renderRow(tweet, container) {
    const row = container.createDiv({ cls: "scheduledTweet" });
    for (const item of tweet.content) {
      row.createDiv({ cls: "tweetContainer" }).createEl("span", { text: item });
    }
    row.createEl("p", {
      cls: "nt-scheduled-when",
      text: `Scheduled for: ${formatDateTime(tweet.postat)}`
    });
    new import_obsidian4.Setting(row).addButton(
      (button) => button.setButtonText("Delete").setDestructive().onClick(() => this.deleteTweet(tweet))
    ).addButton(
      (button) => button.setButtonText("Reschedule").onClick(() => this.reschedule(tweet))
    ).addButton(
      (button) => button.setButtonText("Edit").setCta().onClick(() => this.editTweet(tweet))
    );
  }
  async deleteTweet(tweet) {
    try {
      await this.scheduler.deleteScheduledTweet(tweet);
      await this.render();
    } catch (error) {
      log.error(`Could not delete scheduled tweet: ${error}`);
    }
  }
  async reschedule(tweet) {
    let postAt;
    try {
      postAt = await promptForDateTime(this.app);
    } catch (error) {
      log.error(String(error));
      return;
    }
    if (postAt === null) return;
    try {
      await this.scheduler.updateTweet({ ...tweet, postat: postAt });
      await this.render();
    } catch (error) {
      log.error(`Could not reschedule tweet: ${error}`);
    }
  }
  async editTweet(tweet) {
    const result = await ComposeTweetModal.compose(this.app, {
      initialContent: tweet.content,
      submitLabel: "Update",
      autoSplit: false
    });
    if (!result) return;
    try {
      await this.scheduler.updateTweet({ ...tweet, content: result.content });
      await this.render();
    } catch (error) {
      log.error(`Could not update tweet: ${error}`);
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/settingsTab.ts
var RECONNECT_DELAY_MS = 800;
var NoteTweetSettingsTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, noteTweet) {
    super(app, noteTweet);
    this.noteTweet = noteTweet;
    this.statusEls = /* @__PURE__ */ new Map();
    this.reconnectTimer = null;
  }
  getControlValue(key2) {
    const settings = this.noteTweet.settings;
    switch (key2) {
      case "defaultAccountId":
        return settings.defaultAccountId;
      case "postTweetTag":
        return settings.postTweetTag;
      case "autoSplitTweets":
        return settings.autoSplitTweets;
      case "soundEffects":
        return settings.soundEffects;
      case "scheduling.enabled":
        return settings.scheduling.enabled;
      case "scheduling.url":
        return settings.scheduling.url;
      default:
        return void 0;
    }
  }
  async setControlValue(key2, value) {
    const settings = this.noteTweet.settings;
    switch (key2) {
      case "defaultAccountId":
        settings.defaultAccountId = String(value);
        break;
      case "postTweetTag":
        settings.postTweetTag = String(value);
        break;
      case "autoSplitTweets":
        settings.autoSplitTweets = Boolean(value);
        break;
      case "soundEffects":
        settings.soundEffects = Boolean(value);
        ntSoundOn = settings.soundEffects;
        ntSound("toggle");
        break;
      case "scheduling.enabled":
        settings.scheduling.enabled = Boolean(value);
        await this.noteTweet.saveSettings();
        this.noteTweet.refreshScheduler();
        this.refreshDomState();
        return;
      case "scheduling.url":
        settings.scheduling.url = String(value);
        await this.noteTweet.saveSettings();
        this.noteTweet.refreshScheduler();
        return;
      default:
        return;
    }
    await this.noteTweet.saveSettings();
  }
  getSettingDefinitions() {
    return [
      this.migrationGroup(),
      this.accountsGroup(),
      ...this.noteTweet.settings.accounts.map(
        (account) => this.accountCredentialsGroup(account)
      ),
      this.postingGroup(),
      this.schedulingGroup()
    ];
  }
  migrationGroup() {
    return {
      type: "group",
      heading: "Migrate credentials",
      visible: () => legacyCredentialsPresent(this.legacyData()) && hasSecretStorage(this.app),
      items: [
        {
          name: "Move credentials to secure storage",
          desc: "Your Twitter credentials are still stored in this vault's plugin data. Move them into Obsidian's encrypted secret storage.",
          render: (setting) => {
            setting.addButton(
              (button) => button.setButtonText("Migrate now").setCta().onClick(() => this.migrate())
            );
          }
        }
      ]
    };
  }
  accountsGroup() {
    return {
      type: "group",
      heading: "X accounts",
      items: [
        {
          name: "Secret storage unavailable",
          desc: "This version of Obsidian does not support secret storage, so credentials cannot be stored securely. Update Obsidian to use NoteTweet.",
          visible: () => !hasSecretStorage(this.app)
        },
        {
          name: "Default account",
          desc: "Used by Post selection as tweet and Post file as thread. The composer lets you choose per post.",
          visible: () => this.noteTweet.settings.accounts.length > 0,
          control: {
            type: "dropdown",
            key: "defaultAccountId",
            options: Object.fromEntries(
              this.noteTweet.settings.accounts.map(({ id, name }) => [id, name])
            )
          }
        },
        {
          name: "Add account",
          desc: "Create a named X account. Its four credentials are stored only in Obsidian Secret Storage.",
          render: (setting) => {
            setting.addButton(
              (button) => button.setButtonText("Add account").setCta().onClick(() => this.addAccount())
            );
          }
        }
      ]
    };
  }
  accountCredentialsGroup(account) {
    return {
      type: "group",
      heading: account.name,
      items: [
        {
          name: "Account name",
          render: (setting) => {
            setting.addText(
              (text) => text.setValue(account.name).onChange(async (value) => {
                const name = value.trim();
                if (!name) return;
                account.name = name;
                await this.noteTweet.saveSettings();
              })
            );
          }
        },
        {
          name: "Connection",
          searchable: false,
          render: (setting) => {
            const status = setting.controlEl.createSpan();
            this.statusEls.set(account.id, status);
            this.refreshStatus(account.id);
            setting.addButton(
              (button) => button.setButtonText("Test").onClick(() => this.testConnection(account.id))
            );
          }
        },
        this.accountSecretRow(
          account.id,
          "API key",
          "apiKey",
          "Enter your API key",
          "Your app's API Key (also called the Consumer Key), from Keys and tokens in the X developer portal."
        ),
        this.accountSecretRow(
          account.id,
          "API secret",
          "apiSecret",
          "Enter your API secret",
          "Your app's API Key Secret (the Consumer Secret)."
        ),
        this.accountSecretRow(
          account.id,
          "Access token",
          "accessToken",
          "Enter your access token",
          "Generate under Keys and tokens -> Access Token and Secret (requires Read and Write user authentication)."
        ),
        this.accountSecretRow(
          account.id,
          "Access token secret",
          "accessTokenSecret",
          "Enter your access token secret",
          "The Access Token Secret shown when you generate the access token."
        ),
        {
          name: "Remove account",
          desc: "Remove this account and clear its credentials from Secret Storage.",
          render: (setting) => {
            setting.addButton(
              (button) => button.setButtonText("Remove").setDestructive().onClick(() => this.removeAccount(account))
            );
          }
        }
      ]
    };
  }
  postingGroup() {
    return {
      type: "group",
      heading: "Posting",
      items: [
        {
          name: "Tweet tag",
          desc: "Appended to your note after a tweet is posted, marking it as tweeted. Leave empty to disable.",
          control: { type: "text", key: "postTweetTag", placeholder: "#tweeted" }
        },
        {
          name: "Auto-split tweets",
          desc: "Split content into multiple tweets at 280 characters. Disable to allow longer tweets (requires a paid X plan).",
          control: { type: "toggle", key: "autoSplitTweets" }
        },
        {
          name: "Sound effects",
          desc: "Play short, quiet sounds when you add, move, or delete posts, attach images, and post.",
          control: { type: "toggle", key: "soundEffects" }
        }
      ]
    };
  }
  schedulingGroup() {
    const whenEnabled = () => this.noteTweet.settings.scheduling.enabled;
    return {
      type: "group",
      heading: "Scheduling",
      items: [
        {
          name: "Enable scheduling",
          desc: "Post tweets on a schedule through a self-hosted scheduler. Requires setup.",
          control: { type: "toggle", key: "scheduling.enabled" }
        },
        {
          name: "Scheduler URL",
          desc: "The base URL of your scheduler endpoint.",
          visible: whenEnabled,
          control: {
            type: "text",
            key: "scheduling.url",
            placeholder: "https://scheduler.example.com"
          }
        },
        {
          name: "Scheduler password",
          desc: "Password configured on your scheduler.",
          visible: whenEnabled,
          render: (setting) => this.renderSecretInput(
            setting,
            SECRET_IDS.schedulerPassword,
            "Scheduler password",
            () => this.noteTweet.refreshScheduler()
          )
        },
        {
          name: "Scheduled tweets",
          desc: "View and manage tweets you have scheduled.",
          visible: whenEnabled,
          render: (setting) => {
            setting.addButton(
              (button) => button.setButtonText("Open").onClick(() => this.openScheduledTweets())
            );
          }
        }
      ]
    };
  }
  accountSecretRow(accountId, name, field, placeholder, desc) {
    return {
      name,
      ...desc ? { desc } : {},
      render: (setting) => this.renderSecretInput(
        setting,
        accountSecretId(accountId, field),
        placeholder,
        () => this.scheduleReconnect(accountId)
      )
    };
  }
  renderSecretInput(setting, id, placeholder, onChanged) {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder(placeholder).setValue(getSecret(this.app, id)).onChange((value) => {
        setSecret(this.app, id, value);
        onChanged();
      });
    });
  }
  legacyData() {
    return this.noteTweet.settings;
  }
  refreshStatus(accountId, message = "Not checked.", connected) {
    const statusEl = this.statusEls.get(accountId);
    if (!statusEl) return;
    statusEl.setText(message);
    statusEl.toggleClass("nt-status--ok", connected === true);
    statusEl.toggleClass("nt-status--err", connected === false);
  }
  async testConnection(accountId) {
    this.refreshStatus(accountId, "Verifying credentials...");
    const client = await this.noteTweet.connectAccount(accountId);
    if (client.isConnected) {
      this.refreshStatus(accountId, "Connected to X.", true);
      return;
    }
    const message = client.lastError ? `Not connected: ${client.lastError}` : "Not connected. Enter all four credentials.";
    this.refreshStatus(accountId, message, false);
  }
  scheduleReconnect(accountId) {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.refreshStatus(accountId, "Waiting to verify...");
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.testConnection(accountId);
    }, RECONNECT_DELAY_MS);
  }
  async addAccount() {
    const settings = this.noteTweet.settings;
    const used = new Set(settings.accounts.map(({ name }) => name));
    let number = settings.accounts.length + 1;
    while (used.has(`Account ${number}`)) number += 1;
    const account = createAccount(`Account ${number}`);
    settings.accounts.push(account);
    if (!settings.defaultAccountId) settings.defaultAccountId = account.id;
    await this.noteTweet.saveSettings();
    this.update();
  }
  async removeAccount(account) {
    if (!window.confirm(`Remove the X account "${account.name}"?`)) return;
    const settings = this.noteTweet.settings;
    const previousAccounts = settings.accounts;
    const previousDefault = settings.defaultAccountId;
    settings.accounts = settings.accounts.filter(({ id }) => id !== account.id);
    if (settings.defaultAccountId === account.id) {
      settings.defaultAccountId = settings.accounts[0]?.id ?? "";
    }
    try {
      await this.noteTweet.saveSettings();
    } catch (error) {
      settings.accounts = previousAccounts;
      settings.defaultAccountId = previousDefault;
      throw error;
    }
    clearAccountCredentials(this.app, account.id);
    this.statusEls.delete(account.id);
    this.update();
  }
  openScheduledTweets() {
    this.noteTweet.refreshScheduler();
    if (!this.noteTweet.scheduler) {
      new import_obsidian5.Notice("Set a scheduler URL first.");
      return;
    }
    new ScheduledTweetsModal(this.app, this.noteTweet.scheduler).open();
  }
  async migrate() {
    const data = this.legacyData();
    const encrypted = legacyCredentialsEncrypted(data);
    let password;
    if (encrypted) {
      const entered = await InputPromptModal.prompt(
        this.app,
        "Enter your Secure Mode password",
        { password: true }
      );
      if (!entered) return;
      password = entered;
    }
    let credentials;
    try {
      credentials = readLegacyCredentials(data, password);
    } catch {
      log.error("Could not decrypt your credentials - wrong password?");
      return;
    }
    if (encrypted) {
      const ok = await this.noteTweet.verifyCredentials(credentials);
      if (!ok) {
        log.error(
          "Those credentials did not work. Check your password and try again."
        );
        return;
      }
    }
    const settings = this.noteTweet.settings;
    const account = createAccount(
      settings.accounts.length === 0 ? "Default" : "Imported account"
    );
    settings.accounts.push(account);
    if (!settings.defaultAccountId) settings.defaultAccountId = account.id;
    storeCredentials(this.app, account.id, credentials);
    stripLegacyCredentials(data);
    await this.noteTweet.saveSettings();
    this.noteTweet.refreshScheduler(credentials.schedulerPassword);
    new import_obsidian5.Notice(`NoteTweet: credentials moved to the ${account.name} account.`);
    this.update();
  }
};

// src/xApi.ts
var import_obsidian6 = require("obsidian");

// src/oauth1.ts
function percentEncode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
function randomNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
function base64FromBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
async function hmacSha1Base64(key2, message) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key2),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  );
  return base64FromBytes(new Uint8Array(signature));
}
async function oauth1Header(args) {
  const { method, url, credentials, params = {} } = args;
  const timestamp = args.timestamp ?? Math.floor(Date.now() / 1e3);
  const nonce = args.nonce ?? randomNonce();
  const oauthParams = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(timestamp),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0"
  };
  const paramString = [...Object.entries(params), ...Object.entries(oauthParams)].map(([key2, value]) => [percentEncode(key2), percentEncode(value)]).sort(([keyA, valueA], [keyB, valueB]) => {
    const a = keyA === keyB ? valueA : keyA;
    const b = keyA === keyB ? valueB : keyB;
    return a < b ? -1 : a > b ? 1 : 0;
  }).map(([key2, value]) => `${key2}=${value}`).join("&");
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString)
  ].join("&");
  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(
    credentials.accessTokenSecret
  )}`;
  const signature = await hmacSha1Base64(signingKey, baseString);
  const headerParams = {
    ...oauthParams,
    oauth_signature: signature
  };
  const header = Object.keys(headerParams).sort().map((key2) => `${percentEncode(key2)}="${percentEncode(headerParams[key2])}"`).join(", ");
  return `OAuth ${header}`;
}

// src/xApi.ts
var BASE_URL = "https://api.x.com";
var GIF_CHUNK_BYTES = 1024 * 1024;
var MAX_STATUS_POLLS = 10;
var obsidianRequest = async (req) => {
  const response = await (0, import_obsidian6.requestUrl)({
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    throw: false
  });
  let json;
  try {
    json = response.json;
  } catch {
    json = void 0;
  }
  return { status: response.status, text: response.text, json };
};
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function extractApiError(status, body) {
  if (isRecord(body)) {
    const errors = body.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];
      if (isRecord(first)) {
        if (typeof first.message === "string") return first.message;
        if (typeof first.detail === "string") return first.detail;
      }
    }
    if (typeof body.title === "string") return body.title;
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.message === "string") return body.message;
  }
  return `HTTP ${status}`;
}
function mediaIdOf(json) {
  const data = isRecord(json) ? json.data : void 0;
  if (isRecord(data) && typeof data.id === "string") return data.id;
  throw new Error("X media upload returned no media id.");
}
function processingInfoOf(json) {
  const data = isRecord(json) ? json.data : void 0;
  const info = isRecord(data) ? data.processing_info : void 0;
  if (!isRecord(info) || typeof info.state !== "string") return void 0;
  return {
    state: info.state,
    checkAfterSecs: typeof info.check_after_secs === "number" ? info.check_after_secs : void 0
  };
}
function sleep(ms) {
  const { promise, resolve } = deferred();
  window.setTimeout(resolve, ms);
  return promise;
}
var XApiClient = class {
  constructor(credentials, request = obsidianRequest) {
    this.credentials = credentials;
    this.request = request;
  }
  async me() {
    const json = await this.call("GET", "/2/users/me");
    const data = isRecord(json) ? json.data : void 0;
    if (isRecord(data) && typeof data.id === "string" && typeof data.name === "string" && typeof data.username === "string") {
      return { id: data.id, name: data.name, username: data.username };
    }
    throw new Error("Unexpected response from /2/users/me.");
  }
  async createTweet(payload) {
    const json = await this.call("POST", "/2/tweets", { body: payload });
    const data = isRecord(json) ? json.data : void 0;
    if (isRecord(data) && typeof data.id === "string" && typeof data.text === "string") {
      return { data: { id: data.id, text: data.text } };
    }
    throw new Error("Unexpected response from /2/tweets.");
  }
  async deleteTweet(id) {
    await this.call("DELETE", `/2/tweets/${id}`);
  }
  /** Uploads one image/GIF; resolves to the media id string for media_ids. */
  async uploadMedia(data, mimeType) {
    if (mimeType === "image/gif") return this.uploadGif(data);
    const json = await this.call("POST", "/2/media/upload", {
      body: {
        media: (0, import_obsidian6.arrayBufferToBase64)(data),
        media_category: "tweet_image",
        media_type: mimeType
      }
    });
    return mediaIdOf(json);
  }
  /**
   * One-shot /2/media/upload rejects GIFs (its media_type enum lacks
   * image/gif), so GIFs go through the chunked initialize/append/finalize
   * flow with the tweet_gif category.
   */
  async uploadGif(data) {
    const initialized = await this.call("POST", "/2/media/upload/initialize", {
      body: {
        media_type: "image/gif",
        total_bytes: data.byteLength,
        media_category: "tweet_gif"
      }
    });
    const id = mediaIdOf(initialized);
    for (let offset = 0; offset < data.byteLength; offset += GIF_CHUNK_BYTES) {
      await this.call("POST", `/2/media/upload/${id}/append`, {
        body: {
          media: (0, import_obsidian6.arrayBufferToBase64)(
            data.slice(offset, offset + GIF_CHUNK_BYTES)
          ),
          segment_index: offset / GIF_CHUNK_BYTES
        }
      });
    }
    const finalized = await this.call("POST", `/2/media/upload/${id}/finalize`);
    return this.awaitProcessing(id, finalized);
  }
  /**
   * Waits for async media processing after FINALIZE by polling
   * GET /2/media/upload?command=STATUS. A response without processing_info
   * means the media is already usable.
   */
  async awaitProcessing(id, finalized) {
    let info = processingInfoOf(finalized);
    for (let attempt = 0; attempt < MAX_STATUS_POLLS; attempt++) {
      if (!info || info.state === "succeeded") return id;
      if (info.state === "failed") {
        throw new Error("X could not process the uploaded media.");
      }
      await sleep((info.checkAfterSecs ?? 1) * 1e3);
      const status = await this.call("GET", "/2/media/upload", {
        query: { command: "STATUS", media_id: id }
      });
      info = processingInfoOf(status);
    }
    throw new Error("Timed out waiting for X to process the uploaded media.");
  }
  /** Signs and sends one JSON request; throws a human message on >= 400. */
  async call(method, path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const authorization = await oauth1Header({
      method,
      url,
      credentials: this.credentials,
      params: options.query ?? {}
    });
    const headers = { Authorization: authorization };
    let body;
    if (options.body !== void 0) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
    const query = Object.entries(options.query ?? {}).map(([key2, value]) => `${percentEncode(key2)}=${percentEncode(value)}`).join("&");
    const response = await this.request({
      url: query ? `${url}?${query}` : url,
      method,
      headers,
      body
    });
    if (response.status >= 400) {
      throw new Error(extractApiError(response.status, response.json));
    }
    return response.json;
  }
};

// src/twitter.ts
var IMAGE_REGEX = /!?\[\[([\w .\-/]*\.(gif|jpe?g|tiff?|png|webp|bmp))]]/i;
var MIME_BY_EXTENSION = {
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  tif: "image/tiff",
  tiff: "image/tiff",
  png: "image/png",
  webp: "image/webp",
  bmp: "image/bmp"
};
var TwitterClient = class {
  constructor(app, request) {
    this.app = app;
    this.request = request;
    this.client = null;
    this.isConnected = false;
    this.lastError = null;
  }
  /**
   * Connect and verify the credentials with a `me()` call. Any failure
   * (bad credentials, an app not attached to a v2 Project, network) leaves the
   * client disconnected and records the X-provided reason in {@link lastError}
   * so the UI can show something actionable. NoteTweet uses the v2 API for
   * posting too, so a forbidden v2 check means posting would fail as well.
   */
  async connect(credentials) {
    if (!hasCompleteCredentials(credentials)) {
      this.client = null;
      this.isConnected = false;
      this.lastError = null;
      return false;
    }
    try {
      this.client = new XApiClient(
        {
          consumerKey: credentials.apiKey,
          consumerSecret: credentials.apiSecret,
          accessToken: credentials.accessToken,
          accessTokenSecret: credentials.accessTokenSecret
        },
        this.request
      );
      await this.client.me();
      this.isConnected = true;
      this.lastError = null;
      return true;
    } catch (error) {
      this.client = null;
      this.isConnected = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }
  async postThread(content) {
    const client = this.requireClient();
    const payloads = [];
    for (const text of content) {
      payloads.push(await this.buildTweet(text));
    }
    const posted = [];
    for (const payload of payloads) {
      const previous = posted[posted.length - 1];
      if (previous) {
        payload.reply = { in_reply_to_tweet_id: previous.data.id };
      }
      posted.push(await client.createTweet(payload));
    }
    return posted;
  }
  async postTweet(text) {
    const client = this.requireClient();
    return client.createTweet(await this.buildTweet(text));
  }
  async deleteTweets(tweets) {
    const client = this.requireClient();
    try {
      for (const tweet of tweets) {
        await client.deleteTweet(tweet.id);
      }
      return true;
    } catch (error) {
      log.error(`Could not delete tweets: ${error}`);
      return false;
    }
  }
  requireClient() {
    if (!this.client) throw new Error("Not connected to Twitter.");
    return this.client;
  }
  /** Resolve embedded image links to uploaded media and strip them from text. */
  async buildTweet(text) {
    const client = this.requireClient();
    const mediaIds = [];
    let body = text;
    let match;
    while ((match = IMAGE_REGEX.exec(body)) !== null) {
      const fileName = match[1];
      body = body.replace(IMAGE_REGEX, "").trim();
      const file = this.app.metadataCache.getFirstLinkpathDest(fileName, "");
      if (!file) {
        log.warning(`Could not find image '${fileName}' in the vault.`);
        continue;
      }
      const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
      const mimeType = MIME_BY_EXTENSION[extension];
      const data = await this.app.vault.readBinary(file);
      try {
        mediaIds.push(await client.uploadMedia(data, mimeType));
      } catch {
        log.warning(`Could not upload image '${fileName}' to Twitter.`);
      }
    }
    if (mediaIds.length === 0) return { text: body };
    return { text: body, media: { media_ids: mediaIds } };
  }
};

// src/scheduler.ts
var import_obsidian7 = require("obsidian");
var SelfHostedScheduler = class {
  constructor(url, password) {
    this.url = url;
    this.password = password;
  }
  async scheduleTweet(tweet) {
    await this.send("/scheduleTweet", "POST", {
      tweet,
      postAt: tweet.postat
    });
    const when = formatDateTime(tweet.postat);
    new import_obsidian7.Notice(
      `Scheduled '${tweet.content[0].slice(0, 10)}...' for ${when}`
    );
  }
  async getScheduledTweets() {
    const response = await this.send("/scheduledTweets", "GET");
    return response.json ?? [];
  }
  async deleteScheduledTweet(tweet) {
    await this.send("/deleteScheduled", "DELETE", { tweet });
  }
  async updateTweet(tweet) {
    await this.send("/updateTweet", "POST", {
      tweet,
      postAt: tweet.postat
    });
  }
  async send(path, method, body) {
    const response = await (0, import_obsidian7.requestUrl)({
      url: `${this.url}${path}`,
      method,
      headers: { Authorization: `Basic ${btoa(`:${this.password}`)}` },
      throw: false,
      ...body !== void 0 ? { contentType: "application/json", body: JSON.stringify(body) } : {}
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Scheduler request to ${path} failed with status ${response.status}.`
      );
    }
    return response;
  }
};

// src/Modals/TweetsPostedModal.ts
var import_obsidian8 = require("obsidian");
var TweetsPostedModal = class extends import_obsidian8.Modal {
  constructor(app, posts, twitter) {
    super(app);
    this.posts = posts;
    this.twitter = twitter;
    this.userDeletedTweets = false;
    const { promise, resolve } = deferred();
    this.waitForClose = promise;
    this.resolveClose = resolve;
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(
      this.posts.length > 1 ? "Your tweets are live!" : "Your tweet is live!"
    );
    this.modalEl.addClass("nt-posted-modal");
    ntSound("posted");
    this.titleEl.prepend(ntIcon(createFragment(), "check"));
    const list = contentEl.createDiv({ cls: "nt-posted-list" });
    this.posts.forEach((post, index) => {
      const item = list.createEl("a", {
        cls: "nt-posted-item",
        href: `https://x.com/i/status/${post.data.id}`,
        attr: { target: "_blank", rel: "noopener", "aria-label": "Open on X" }
      });
      item.style.setProperty("--i", String(index));
      item.createSpan({ cls: "nt-posted-text", text: post.data.text });
      ntIcon(item, "open");
    });
    new import_obsidian8.Setting(contentEl).addButton(
      (button) => button.setButtonText("Delete").setDestructive().onClick(() => this.deletePosted())
    ).addButton(
      (button) => button.setButtonText("Great!").setCta().onClick(() => this.close())
    );
  }
  async deletePosted() {
    const deleted = await this.twitter.deleteTweets(
      this.posts.map((post) => ({ id: post.data.id }))
    );
    if (!deleted) {
      new import_obsidian8.Notice("Could not delete tweet(s).");
      return;
    }
    this.userDeletedTweets = true;
    ntSound("deleted");
    const plural = this.posts.length > 1 ? "s" : "";
    new import_obsidian8.Notice(`${this.posts.length} tweet${plural} deleted.`);
    this.close();
  }
  onClose() {
    this.contentEl.empty();
    this.resolveClose();
  }
};

// src/main.ts
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
var NoteTweet = class extends import_obsidian9.Plugin {
  constructor() {
    super(...arguments);
    this.scheduler = null;
  }
  async onload() {
    await this.loadSettings();
    const migrated = stageFixedSecretMigration(this.app, this.settings);
    if (migrated) {
      await this.saveSettings();
      clearFixedTwitterSecrets(this.app);
      new import_obsidian9.Notice(
        `NoteTweet: existing credentials moved to the ${migrated.name} account.`
      );
    }
    this.refreshScheduler();
    this.addCommand({
      id: "post-tweet",
      name: "Post tweet",
      callback: () => void this.composeAndPost()
    });
    this.addCommand({
      id: "post-selected-as-tweet",
      name: "Post selection as tweet",
      editorCallback: (editor) => void this.postSelection(editor)
    });
    this.addCommand({
      id: "post-file-as-thread",
      name: "Post file as thread",
      callback: () => void this.postFileAsThread()
    });
    this.addCommand({
      id: "post-current-block",
      name: "Post current block",
      editorCallback: (editor, view) => void this.postCurrentBlock(editor, view.file)
    });
    this.addRibbonIcon("send", "Post current block", () => {
      const view = this.app.workspace.getMostRecentLeaf()?.view;
      if (!(view instanceof import_obsidian9.MarkdownView)) {
        log.warning("Open a Markdown note first.");
        return;
      }
      void this.postCurrentBlock(view.editor, view.file);
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        if (!editor.somethingSelected()) {
          if (!blockAtCursor(editor)) return;
          menu.addItem(
            (item) => item.setTitle("Post current block").setIcon("send").onClick(() => void this.postCurrentBlock(editor, view.file))
          );
          return;
        }
        menu.addItem(
          (item) => item.setTitle("Compose post from selection").setIcon("send").onClick(() => void this.composeAndPost())
        );
      })
    );
    this.addSettingTab(new NoteTweetSettingsTab(this.app, this));
    if (legacyCredentialsPresent(this.legacyData())) {
      new import_obsidian9.Notice(
        "NoteTweet: open settings to move your credentials into secure storage."
      );
    }
  }
  async loadSettings() {
    const loaded = await this.loadData() ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    this.settings.accounts = Array.isArray(loaded.accounts) ? loaded.accounts : [];
    this.settings.scheduling = Object.assign(
      {},
      DEFAULT_SETTINGS.scheduling,
      this.settings.scheduling
    );
    normalizeAccountSettings(this.settings);
    ntSoundOn = this.settings.soundEffects !== false;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /** Build and verify an account-scoped client for one direct posting action. */
  async connectAccount(accountId) {
    const client = new TwitterClient(this.app);
    const exists = this.settings.accounts.some(({ id }) => id === accountId);
    if (exists) await client.connect(getAccountCredentials(this.app, accountId));
    return client;
  }
  async verifyCredentials(credentials) {
    return new TwitterClient(this.app).connect(credentials);
  }
  /** Rebuild the scheduler from current settings, or clear it when disabled. */
  refreshScheduler(passwordOverride) {
    const { enabled, url } = this.settings.scheduling;
    if (!enabled || !url) {
      this.scheduler = null;
      return;
    }
    const password = passwordOverride ?? resolveSchedulerPassword(this.app, this.legacyData());
    this.scheduler = new SelfHostedScheduler(url, password);
  }
  /** The persisted settings viewed as the legacy shape, for migration reads. */
  legacyData() {
    return this.settings;
  }
  currentSelection() {
    const editor = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView)?.editor;
    return editor?.somethingSelected() ? editor.getSelection() : null;
  }
  /** 本地补丁：把光标所在的块（列表项连同子项，或所在段落）带进撰写框；发出去以后在这一块的第一行末尾打标签 */
  async postCurrentBlock(editor, file) {
    const block = blockAtCursor(editor);
    if (!block) {
      log.warning("Put the cursor in a paragraph or a list item first.");
      return;
    }
    const attachments = block.images.map((link) => this.app.metadataCache.getFirstLinkpathDest(link, file?.path ?? "")).filter((image) => image && IMAGE_EXTENSIONS[image.extension.toLowerCase()] === true).slice(0, MAX_MEDIA);
    await this.composeAndPost(
      { initialText: block.text, initialAttachments: attachments },
      file ? () => this.tagBlock(file, block.firstLine) : void 0
    );
  }
  async tagBlock(file, firstLine) {
    const tag = this.settings.postTweetTag;
    await this.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const index = lines.indexOf(firstLine);
      if (index === -1 || lines[index].includes(tag)) return data;
      const blockId = lines[index].match(/\s\^[\w-]+\s*$/)?.[0] ?? "";
      lines[index] = `${lines[index].slice(0, lines[index].length - blockId.length).trimEnd()} ${tag}${blockId}`;
      return lines.join("\n");
    });
  }
  async composeAndPost(preset, tagSource) {
    const options = {
      allowSchedule: this.settings.scheduling.enabled,
      autoSplit: this.settings.autoSplitTweets,
      accounts: this.settings.accounts,
      selectedAccountId: this.settings.defaultAccountId,
      ...preset
    };
    const selection = preset ? null : this.currentSelection();
    if (selection) {
      try {
        options.initialContent = parseThread(selection);
      } catch {
        options.initialText = selection;
      }
    }
    const result = await ComposeTweetModal.compose(this.app, options);
    if (!result) return;
    if (result.postAt != null) {
      await this.schedule(result.content, result.postAt);
      return;
    }
    const client = await this.clientForAccount(result.accountId);
    if (!client) return;
    try {
      await this.showPosted(await this.withPosting(result.content.length, () => client.postThread(result.content)), client, tagSource);
    } catch (error) {
      ntSound("failed");
      log.error(`Failed to post tweet: ${errorMessage(error)}`);
    }
  }
  /** 本地补丁：发帖期间挂一个转圈的提示，发完（或失败）收起 */
  async withPosting(count, work) {
    const notice = new import_obsidian9.Notice(createFragment((frag) => {
      const row = frag.createDiv({ cls: "nt-posting" });
      ntIcon(row, "loader");
      row.createSpan({ text: count > 1 ? `Posting ${count} posts…` : "Posting…" });
    }), 0);
    try {
      return await work();
    } finally {
      notice.hide();
    }
  }
  async postSelection(editor) {
    if (!editor.somethingSelected()) {
      log.warning("Nothing is selected.");
      return;
    }
    const client = await this.clientForAccount(this.settings.defaultAccountId);
    if (!client) return;
    try {
      const posted = await this.withPosting(1, () => client.postTweet(editor.getSelection()));
      await this.showPosted([posted], client);
    } catch (error) {
      ntSound("failed");
      log.error(`Failed to post tweet: ${errorMessage(error)}`);
    }
  }
  async postFileAsThread() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      log.warning("Open a Markdown note first.");
      return;
    }
    let thread;
    try {
      thread = parseThread(await this.app.vault.read(file));
    } catch (error) {
      log.warning(`Could not parse a thread in ${file.name}: ${errorMessage(error)}`);
      return;
    }
    const client = await this.clientForAccount(this.settings.defaultAccountId);
    if (!client) return;
    try {
      await this.showPosted(await this.withPosting(thread.length, () => client.postThread(thread)), client);
    } catch (error) {
      ntSound("failed");
      log.error(`Failed to post thread: ${errorMessage(error)}`);
    }
  }
  async schedule(content, postAt) {
    this.refreshScheduler();
    if (!this.scheduler) {
      new import_obsidian9.Notice("Set a scheduler URL in settings first.");
      return;
    }
    const tweet = {
      id: crypto.randomUUID(),
      content,
      postat: postAt
    };
    try {
      await this.scheduler.scheduleTweet(tweet);
    } catch (error) {
      log.error(`Failed to schedule tweet: ${errorMessage(error)}`);
    }
  }
  async clientForAccount(accountId) {
    if (!accountId) {
      new import_obsidian9.Notice("NoteTweet: add an X account in settings first.");
      return null;
    }
    const client = await this.connectAccount(accountId);
    if (client.isConnected) return client;
    new import_obsidian9.Notice(
      "NoteTweet: that X account is not connected. Check its credentials in settings."
    );
    return null;
  }
  async showPosted(posts, client, tagSource) {
    if (posts.length === 0) return;
    const modal = new TweetsPostedModal(this.app, posts, client);
    modal.open();
    await modal.waitForClose;
    if (modal.userDeletedTweets || !this.settings.postTweetTag) return;
    if (tagSource) {
      await tagSource();
      return;
    }
    for (const post of posts) await this.appendTweetTag(post.data.text);
  }
  async appendTweetTag(text) {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;
    const trimmed = text.trim();
    await this.app.vault.process(
      file,
      (data) => data.replace(trimmed, `${trimmed} ${this.settings.postTweetTag}`)
    );
  }
};
/*! Bundled license information:

punycode/punycode.js:
  (*! https://mths.be/punycode v1.4.1 by @mathias *)

crypto-es/lib/ripemd160.js:
  (** @preserve
  (c) 2012 by Cédric Mesnil. All rights reserved.
  
  Redistribution and use in source and binary forms, with or without modification, are permitted
  provided that the following conditions are met:
  
      - Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.
      - Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.
  
  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
  DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
  WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  *)

crypto-es/lib/mode-ctr-gladman.js:
  (** @preserve
   * Counter block mode compatible with  Dr Brian Gladman fileenc.c
   * derived from CryptoJS.mode.CTR
   * Jan Hruby jhruby.web@gmail.com
   *)
*/

/* nosourcemap */