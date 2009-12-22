// NOTE: depends heavily on prototype.js

function forceArray(items) {
	if (items != undefined) return items.constructor == Array ? items : [items]; else return [];
}

function returnNull() { return null; };
function returnTrue() { return true; };
function returnFalse() { return false; };
function returnArg(arg) { return arg; };

Object.extend(Enumerable, {
	contains: Enumerable.include,
	maxBy: function(iterator) {
		var result;
		this.each(function(item) {
			var itemValue = iterator(item);
			if (result == undefined || itemValue > result) {
				result = item;
			}
		});
		return result;
	},
	valuesAt: function(keys) {
		var that = this;
		return $A(arguments).flatten().collect(function(key) {
			return that[key];
		})
	},
  hashBy: function(keygen) {
    return this.inject(new Hash(), function(memo, o) {
      memo.set(keygen(o), o);
      return memo;
    })
  },

  hashByMember: function(member) {
    return this.hashBy(function(o) { return o[member]; });
  }
});

Object.extend(Array.prototype, {
	insert: function(index, item) {
		this.splice(index, 0, item);
	},

	clone: function() {
		return this.slice(0);
	},

	remove: function(o) {
		var index = this.indexOf(o);
		var found = index >= 0;
		if (found) {
			this.splice(index, 1);
		}
		return found;
	},

	removeAt: function(index) {
		return this.splice(index, 1).reduce();
	},

	// modify prototype's array.flatten to support arbitrary collections that implement flatten
	flatten: function() {
		return this.inject([], function(array, value) {
		  return array.concat(value && value.flatten ? value.flatten() : [value]);
		});
	},

	equals: function(that) {
		if (this.length != that.length) {
			return false;
		}
		for (var i = 0, len = this.length; i < len; ++i) {
			var same;
			if (this[i].equals) {
				same = this[i].equals(that[i]);
			} else {
				same = (this[i] == that[i]);
			}
			if (!same) {
				return false;
			}
		}
		return true;
	},

  mapTo: function(valueGenerator) {
    return this.inject(new Hash(), function(memo, key) {
      memo.set(key, valueGenerator(key));
      return memo;
    });
  },

  add: Array.prototype.push,

  contains: Enumerable.contains,
	maxBy: Enumerable.maxBy,

  append: function(array) {
    this.splice.apply(this, [this.length, 0].concat(array));
    return this;
  }
});

Object.extract = function(source, members) {
  return $A(arguments).flatten().slice(1).inject(new Hash(), function(result, arg) {
    var value = source.get(arg);
    if (value != undefined) {
      result.set(arg, value);
    }
    return result;
  });
};

Hash.prototype.only = function(members) {
  return Object.extract(this, $A(arguments));
};

var Set = Array.newSubclass({
	initialize: function(key_fn) {
		this.key_fn = key_fn;
		this.keys = {};
	},

	add: function(item) {
		var key = this.key_fn(item);
		var isNew = this.keys[key] == undefined;
		if (isNew) {
			this.keys[key] = true;
			this.push(item);
		}
		return isNew;
	},

	addAll: function(items) {
		var changeCount = 0;
		for (var i = 0, len = items.length; i < len; ++i) {
			if (this.add(items[i])) {
				changeCount++;
			}
		}
		return changeCount;
	},

	remove: function(item) {
		var key = this.key_fn(item);
		var found = this.keys[key];
		if (found) {
			delete(this.keys[key]);
			var index = this.indexOf(item);
			this.splice(index, 1);
		}
		return found;
	},

	removeAt: function(index) {
		var item = this[index];
		if (item != undefined) {
			remove(item);
		}
		return item;
	},

	removeAll: function(items) {
		var changeCount = 0;
		for (var i = 0, len = items.length; i < len; ++i) {
			if (this.remove(items[i])) {
				changeCount++;
			}
		}
		return changeCount;
	},

	contains: function(item) {
		var key = this.key_fn(item);
		return this.keys[key] != undefined;
	},
	
	clear: function() {
		this.keys = {};
		this.length = 0;
	},

	equals: function(that) {
		return (this.length == that.length && !this.find(function(item) { return !that.contains(item); }));
	}
});
			
function $S(arry, key_fn) {
	if (!arry.key_fn) {
		Object.extend(arry, Set.prototype);
		arry.initialize(key_fn);
		for (var i = 0; i < arry.length; ++i) {
			var key = key_fn(arry[i]);
			if (arry.keys[key]) {
				// duplicate entry; remove it
				arry.removeAt(i);
				--i;
			} else {
				arry.keys[key] = true;
			}
		}
	}
	return arry;
}

Set.WithKeys = function(key_fn) {
    return Set.newSubclass({
        initialize: function() {
            this._super(key_fn);
        }
    });
}
var StringSet = Set.WithKeys(Prototype.K);

var ItemIdSet = Set.WithKeys(function(item) { return item.id; });

function $w(string) { return string.split(/\s+/); }
