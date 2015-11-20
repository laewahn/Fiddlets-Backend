/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global exports, require */

(function() {
	"use strict";

	function Scope(name) {
		this.locals = [];
		this.containedScopes = [];
		this.unknownVariables = [];
		this.locationsIndexedByIdentifiers = {};
		this.params = [];
		this.name = name;
	}

	Scope.prototype.name = undefined;
	Scope.prototype.getName = function() {
		return this.name || "global";
	};

	Scope.prototype.range = undefined;
	Scope.prototype.getRange = function() {
		return this.range;
	};

	Scope.prototype.locals = undefined;
	Scope.prototype.getLocals = function() {
		return this.locals;
	};

	Scope.prototype.containedScopes = undefined;
	Scope.prototype.getContainedScopes = function() {
		return this.containedScopes;
	};
	Scope.prototype.getContainedScope = function(scopeIdx) {
		return this.getContainedScopes()[scopeIdx];
	};

	Scope.prototype.getScopeForLine = function(line) {

		var returnScope = this;

		var hasChildScope = this.hasChildScopeInLine(line);
		if (hasChildScope) {
			returnScope = this.childScopeInLine(line).getScopeForLine(line);
		}
		
		return returnScope;
	};

	Scope.prototype.hasChildScopeInLine = function(line) {
		return this.getContainedScopes().some(function(nextScope){
			var range = nextScope.getRange();
			return (range.start <= line && line <= range.end);
		});
	};

	Scope.prototype.childScopeInLine = function(line) {
		var childScope;
		var foundChildScope = this.getContainedScopes().some(function(nextScope) {
			var range = nextScope.getRange();
			var found = (range.start <= line && line <= range.end);
			
			if(found) {
				childScope = nextScope;
			}

			return found;
		});

		return foundChildScope ? childScope : null;
	};

	Scope.prototype.whoKnows = function(identifier) {
		if (this.getUnknownVariables().indexOf(identifier) !== -1) {
			return null;
		}

		if (this.getIdentifiers().indexOf(identifier) !== -1) {
			return this;
		}

		if (this.getParent() === undefined) {
			return null;
		}

		return this.getParent().whoKnows(identifier);
	};

	Scope.prototype.parent = undefined;
	Scope.prototype.getParent = function() {
		return this.parent;
	};

	Scope.prototype.unknownVariables = undefined;
	Scope.prototype.getUnknownVariables = function() {
		return this.unknownVariables;
	};

	Scope.prototype.locationsIndexedByIdentifiers = undefined;
	Scope.prototype.getLocationsIndexedByIdentifiers = function() {
		return this.locationsIndexedByIdentifiers;
	};
	Scope.prototype.getLocationsForIdentifier = function(identifier) {
		return this.getLocationsIndexedByIdentifiers()[identifier];
	};
	Scope.prototype.getIdentifiers = function() {
		return Object.keys(this.locationsIndexedByIdentifiers);
	};

	module.exports = Scope;
})();