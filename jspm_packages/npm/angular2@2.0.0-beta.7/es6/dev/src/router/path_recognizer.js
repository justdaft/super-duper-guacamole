/* */ 
"format cjs";
import { RegExpWrapper, StringWrapper, isPresent, isBlank } from 'angular2/src/facade/lang';
import { BaseException } from 'angular2/src/facade/exceptions';
import { StringMapWrapper } from 'angular2/src/facade/collection';
import { RootUrl, serializeParams } from './url_parser';
class TouchMap {
    constructor(map) {
        this.map = {};
        this.keys = {};
        if (isPresent(map)) {
            StringMapWrapper.forEach(map, (value, key) => {
                this.map[key] = isPresent(value) ? value.toString() : null;
                this.keys[key] = true;
            });
        }
    }
    get(key) {
        StringMapWrapper.delete(this.keys, key);
        return this.map[key];
    }
    getUnused() {
        var unused = {};
        var keys = StringMapWrapper.keys(this.keys);
        keys.forEach(key => unused[key] = StringMapWrapper.get(this.map, key));
        return unused;
    }
}
function normalizeString(obj) {
    if (isBlank(obj)) {
        return null;
    }
    else {
        return obj.toString();
    }
}
class ContinuationSegment {
    constructor() {
        this.name = '';
    }
    generate(params) { return ''; }
    match(path) { return true; }
}
class StaticSegment {
    constructor(path) {
        this.path = path;
        this.name = '';
    }
    match(path) { return path == this.path; }
    generate(params) { return this.path; }
}
class DynamicSegment {
    constructor(name) {
        this.name = name;
    }
    match(path) { return path.length > 0; }
    generate(params) {
        if (!StringMapWrapper.contains(params.map, this.name)) {
            throw new BaseException(`Route generator for '${this.name}' was not included in parameters passed.`);
        }
        return normalizeString(params.get(this.name));
    }
}
class StarSegment {
    constructor(name) {
        this.name = name;
    }
    match(path) { return true; }
    generate(params) { return normalizeString(params.get(this.name)); }
}
var paramMatcher = /^:([^\/]+)$/g;
var wildcardMatcher = /^\*([^\/]+)$/g;
function parsePathString(route) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (route.startsWith("/")) {
        route = route.substring(1);
    }
    var segments = splitBySlash(route);
    var results = [];
    var specificity = '';
    // a single slash (or "empty segment" is as specific as a static segment
    if (segments.length == 0) {
        specificity += '2';
    }
    // The "specificity" of a path is used to determine which route is used when multiple routes match
    // a URL. Static segments (like "/foo") are the most specific, followed by dynamic segments (like
    // "/:id"). Star segments add no specificity. Segments at the start of the path are more specific
    // than proceeding ones.
    //
    // The code below uses place values to combine the different types of segments into a single
    // string that we can sort later. Each static segment is marked as a specificity of "2," each
    // dynamic segment is worth "1" specificity, and stars are worth "0" specificity.
    var limit = segments.length - 1;
    for (var i = 0; i <= limit; i++) {
        var segment = segments[i], match;
        if (isPresent(match = RegExpWrapper.firstMatch(paramMatcher, segment))) {
            results.push(new DynamicSegment(match[1]));
            specificity += '1';
        }
        else if (isPresent(match = RegExpWrapper.firstMatch(wildcardMatcher, segment))) {
            results.push(new StarSegment(match[1]));
            specificity += '0';
        }
        else if (segment == '...') {
            if (i < limit) {
                throw new BaseException(`Unexpected "..." before the end of the path for "${route}".`);
            }
            results.push(new ContinuationSegment());
        }
        else {
            results.push(new StaticSegment(segment));
            specificity += '2';
        }
    }
    return { 'segments': results, 'specificity': specificity };
}
// this function is used to determine whether a route config path like `/foo/:id` collides with
// `/foo/:name`
function pathDslHash(segments) {
    return segments.map((segment) => {
        if (segment instanceof StarSegment) {
            return '*';
        }
        else if (segment instanceof ContinuationSegment) {
            return '...';
        }
        else if (segment instanceof DynamicSegment) {
            return ':';
        }
        else if (segment instanceof StaticSegment) {
            return segment.path;
        }
    })
        .join('/');
}
function splitBySlash(url) {
    return url.split('/');
}
var RESERVED_CHARS = RegExpWrapper.create('//|\\(|\\)|;|\\?|=');
function assertPath(path) {
    if (StringWrapper.contains(path, '#')) {
        throw new BaseException(`Path "${path}" should not include "#". Use "HashLocationStrategy" instead.`);
    }
    var illegalCharacter = RegExpWrapper.firstMatch(RESERVED_CHARS, path);
    if (isPresent(illegalCharacter)) {
        throw new BaseException(`Path "${path}" contains "${illegalCharacter[0]}" which is not allowed in a route config.`);
    }
}
/**
 * Parses a URL string using a given matcher DSL, and generates URLs from param maps
 */
export class PathRecognizer {
    constructor(path) {
        this.path = path;
        this.terminal = true;
        assertPath(path);
        var parsed = parsePathString(path);
        this._segments = parsed['segments'];
        this.specificity = parsed['specificity'];
        this.hash = pathDslHash(this._segments);
        var lastSegment = this._segments[this._segments.length - 1];
        this.terminal = !(lastSegment instanceof ContinuationSegment);
    }
    recognize(beginningSegment) {
        var nextSegment = beginningSegment;
        var currentSegment;
        var positionalParams = {};
        var captured = [];
        for (var i = 0; i < this._segments.length; i += 1) {
            var segment = this._segments[i];
            currentSegment = nextSegment;
            if (segment instanceof ContinuationSegment) {
                break;
            }
            if (isPresent(currentSegment)) {
                // the star segment consumes all of the remaining URL, including matrix params
                if (segment instanceof StarSegment) {
                    positionalParams[segment.name] = currentSegment.toString();
                    captured.push(currentSegment.toString());
                    nextSegment = null;
                    break;
                }
                captured.push(currentSegment.path);
                if (segment instanceof DynamicSegment) {
                    positionalParams[segment.name] = currentSegment.path;
                }
                else if (!segment.match(currentSegment.path)) {
                    return null;
                }
                nextSegment = currentSegment.child;
            }
            else if (!segment.match('')) {
                return null;
            }
        }
        if (this.terminal && isPresent(nextSegment)) {
            return null;
        }
        var urlPath = captured.join('/');
        var auxiliary;
        var urlParams;
        var allParams;
        if (isPresent(currentSegment)) {
            // If this is the root component, read query params. Otherwise, read matrix params.
            var paramsSegment = beginningSegment instanceof RootUrl ? beginningSegment : currentSegment;
            allParams = isPresent(paramsSegment.params) ?
                StringMapWrapper.merge(paramsSegment.params, positionalParams) :
                positionalParams;
            urlParams = serializeParams(paramsSegment.params);
            auxiliary = currentSegment.auxiliary;
        }
        else {
            allParams = positionalParams;
            auxiliary = [];
            urlParams = [];
        }
        return { urlPath, urlParams, allParams, auxiliary, nextSegment };
    }
    generate(params) {
        var paramTokens = new TouchMap(params);
        var path = [];
        for (var i = 0; i < this._segments.length; i++) {
            let segment = this._segments[i];
            if (!(segment instanceof ContinuationSegment)) {
                path.push(segment.generate(paramTokens));
            }
        }
        var urlPath = path.join('/');
        var nonPositionalParams = paramTokens.getUnused();
        var urlParams = serializeParams(nonPositionalParams);
        return { urlPath, urlParams };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aF9yZWNvZ25pemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5ndWxhcjIvc3JjL3JvdXRlci9wYXRoX3JlY29nbml6ZXIudHMiXSwibmFtZXMiOlsiVG91Y2hNYXAiLCJUb3VjaE1hcC5jb25zdHJ1Y3RvciIsIlRvdWNoTWFwLmdldCIsIlRvdWNoTWFwLmdldFVudXNlZCIsIm5vcm1hbGl6ZVN0cmluZyIsIkNvbnRpbnVhdGlvblNlZ21lbnQiLCJDb250aW51YXRpb25TZWdtZW50LmNvbnN0cnVjdG9yIiwiQ29udGludWF0aW9uU2VnbWVudC5nZW5lcmF0ZSIsIkNvbnRpbnVhdGlvblNlZ21lbnQubWF0Y2giLCJTdGF0aWNTZWdtZW50IiwiU3RhdGljU2VnbWVudC5jb25zdHJ1Y3RvciIsIlN0YXRpY1NlZ21lbnQubWF0Y2giLCJTdGF0aWNTZWdtZW50LmdlbmVyYXRlIiwiRHluYW1pY1NlZ21lbnQiLCJEeW5hbWljU2VnbWVudC5jb25zdHJ1Y3RvciIsIkR5bmFtaWNTZWdtZW50Lm1hdGNoIiwiRHluYW1pY1NlZ21lbnQuZ2VuZXJhdGUiLCJTdGFyU2VnbWVudCIsIlN0YXJTZWdtZW50LmNvbnN0cnVjdG9yIiwiU3RhclNlZ21lbnQubWF0Y2giLCJTdGFyU2VnbWVudC5nZW5lcmF0ZSIsInBhcnNlUGF0aFN0cmluZyIsInBhdGhEc2xIYXNoIiwic3BsaXRCeVNsYXNoIiwiYXNzZXJ0UGF0aCIsIlBhdGhSZWNvZ25pemVyIiwiUGF0aFJlY29nbml6ZXIuY29uc3RydWN0b3IiLCJQYXRoUmVjb2duaXplci5yZWNvZ25pemUiLCJQYXRoUmVjb2duaXplci5nZW5lcmF0ZSJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFFTCxhQUFhLEVBRWIsYUFBYSxFQUNiLFNBQVMsRUFDVCxPQUFPLEVBQ1IsTUFBTSwwQkFBMEI7T0FDMUIsRUFBQyxhQUFhLEVBQW1CLE1BQU0sZ0NBQWdDO09BQ3ZFLEVBQWtCLGdCQUFnQixFQUFDLE1BQU0sZ0NBQWdDO09BRXpF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Q0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLENBQUNBO1FBQ0hBLENBQUNBO1FBQ0RBLElBQUlBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBRTdCQSxJQUFJQSxtQkFBbUJBLEdBQUdBLFdBQVdBLENBQUNBLFNBQVNBLEVBQUVBLENBQUNBO1FBQ2xEQSxJQUFJQSxTQUFTQSxHQUFHQSxlQUFlQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO1FBRXJEQSxNQUFNQSxDQUFDQSxFQUFDQSxPQUFPQSxFQUFFQSxTQUFTQSxFQUFDQSxDQUFDQTtJQUM5QkEsQ0FBQ0E7QUFDSEgsQ0FBQ0E7QUFBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIFJlZ0V4cCxcbiAgUmVnRXhwV3JhcHBlcixcbiAgUmVnRXhwTWF0Y2hlcldyYXBwZXIsXG4gIFN0cmluZ1dyYXBwZXIsXG4gIGlzUHJlc2VudCxcbiAgaXNCbGFua1xufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtCYXNlRXhjZXB0aW9uLCBXcmFwcGVkRXhjZXB0aW9ufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2V4Y2VwdGlvbnMnO1xuaW1wb3J0IHtNYXAsIE1hcFdyYXBwZXIsIFN0cmluZ01hcFdyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvY29sbGVjdGlvbic7XG5cbmltcG9ydCB7VXJsLCBSb290VXJsLCBzZXJpYWxpemVQYXJhbXN9IGZyb20gJy4vdXJsX3BhcnNlcic7XG5cbmNsYXNzIFRvdWNoTWFwIHtcbiAgbWFwOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBrZXlzOiB7W2tleTogc3RyaW5nXTogYm9vbGVhbn0gPSB7fTtcblxuICBjb25zdHJ1Y3RvcihtYXA6IHtba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gICAgaWYgKGlzUHJlc2VudChtYXApKSB7XG4gICAgICBTdHJpbmdNYXBXcmFwcGVyLmZvckVhY2gobWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB0aGlzLm1hcFtrZXldID0gaXNQcmVzZW50KHZhbHVlKSA/IHZhbHVlLnRvU3RyaW5nKCkgOiBudWxsO1xuICAgICAgICB0aGlzLmtleXNba2V5XSA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIFN0cmluZ01hcFdyYXBwZXIuZGVsZXRlKHRoaXMua2V5cywga2V5KTtcbiAgICByZXR1cm4gdGhpcy5tYXBba2V5XTtcbiAgfVxuXG4gIGdldFVudXNlZCgpOiB7W2tleTogc3RyaW5nXTogYW55fSB7XG4gICAgdmFyIHVudXNlZDoge1trZXk6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICB2YXIga2V5cyA9IFN0cmluZ01hcFdyYXBwZXIua2V5cyh0aGlzLmtleXMpO1xuICAgIGtleXMuZm9yRWFjaChrZXkgPT4gdW51c2VkW2tleV0gPSBTdHJpbmdNYXBXcmFwcGVyLmdldCh0aGlzLm1hcCwga2V5KSk7XG4gICAgcmV0dXJuIHVudXNlZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTdHJpbmcob2JqOiBhbnkpOiBzdHJpbmcge1xuICBpZiAoaXNCbGFuayhvYmopKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iai50b1N0cmluZygpO1xuICB9XG59XG5cbmludGVyZmFjZSBTZWdtZW50IHtcbiAgbmFtZTogc3RyaW5nO1xuICBnZW5lcmF0ZShwYXJhbXM6IFRvdWNoTWFwKTogc3RyaW5nO1xuICBtYXRjaChwYXRoOiBzdHJpbmcpOiBib29sZWFuO1xufVxuXG5jbGFzcyBDb250aW51YXRpb25TZWdtZW50IGltcGxlbWVudHMgU2VnbWVudCB7XG4gIG5hbWU6IHN0cmluZyA9ICcnO1xuICBnZW5lcmF0ZShwYXJhbXM6IFRvdWNoTWFwKTogc3RyaW5nIHsgcmV0dXJuICcnOyB9XG4gIG1hdGNoKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdHJ1ZTsgfVxufVxuXG5jbGFzcyBTdGF0aWNTZWdtZW50IGltcGxlbWVudHMgU2VnbWVudCB7XG4gIG5hbWU6IHN0cmluZyA9ICcnO1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGF0aDogc3RyaW5nKSB7fVxuICBtYXRjaChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHBhdGggPT0gdGhpcy5wYXRoOyB9XG4gIGdlbmVyYXRlKHBhcmFtczogVG91Y2hNYXApOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5wYXRoOyB9XG59XG5cbmNsYXNzIER5bmFtaWNTZWdtZW50IGltcGxlbWVudHMgU2VnbWVudCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBuYW1lOiBzdHJpbmcpIHt9XG4gIG1hdGNoKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gcGF0aC5sZW5ndGggPiAwOyB9XG4gIGdlbmVyYXRlKHBhcmFtczogVG91Y2hNYXApOiBzdHJpbmcge1xuICAgIGlmICghU3RyaW5nTWFwV3JhcHBlci5jb250YWlucyhwYXJhbXMubWFwLCB0aGlzLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcbiAgICAgICAgICBgUm91dGUgZ2VuZXJhdG9yIGZvciAnJHt0aGlzLm5hbWV9JyB3YXMgbm90IGluY2x1ZGVkIGluIHBhcmFtZXRlcnMgcGFzc2VkLmApO1xuICAgIH1cbiAgICByZXR1cm4gbm9ybWFsaXplU3RyaW5nKHBhcmFtcy5nZXQodGhpcy5uYW1lKSk7XG4gIH1cbn1cblxuXG5jbGFzcyBTdGFyU2VnbWVudCBpbXBsZW1lbnRzIFNlZ21lbnQge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgbmFtZTogc3RyaW5nKSB7fVxuICBtYXRjaChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRydWU7IH1cbiAgZ2VuZXJhdGUocGFyYW1zOiBUb3VjaE1hcCk6IHN0cmluZyB7IHJldHVybiBub3JtYWxpemVTdHJpbmcocGFyYW1zLmdldCh0aGlzLm5hbWUpKTsgfVxufVxuXG5cbnZhciBwYXJhbU1hdGNoZXIgPSAvXjooW15cXC9dKykkL2c7XG52YXIgd2lsZGNhcmRNYXRjaGVyID0gL15cXCooW15cXC9dKykkL2c7XG5cbmZ1bmN0aW9uIHBhcnNlUGF0aFN0cmluZyhyb3V0ZTogc3RyaW5nKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAvLyBub3JtYWxpemUgcm91dGUgYXMgbm90IHN0YXJ0aW5nIHdpdGggYSBcIi9cIi4gUmVjb2duaXRpb24gd2lsbFxuICAvLyBhbHNvIG5vcm1hbGl6ZS5cbiAgaWYgKHJvdXRlLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgcm91dGUgPSByb3V0ZS5zdWJzdHJpbmcoMSk7XG4gIH1cblxuICB2YXIgc2VnbWVudHMgPSBzcGxpdEJ5U2xhc2gocm91dGUpO1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuXG4gIHZhciBzcGVjaWZpY2l0eSA9ICcnO1xuXG4gIC8vIGEgc2luZ2xlIHNsYXNoIChvciBcImVtcHR5IHNlZ21lbnRcIiBpcyBhcyBzcGVjaWZpYyBhcyBhIHN0YXRpYyBzZWdtZW50XG4gIGlmIChzZWdtZW50cy5sZW5ndGggPT0gMCkge1xuICAgIHNwZWNpZmljaXR5ICs9ICcyJztcbiAgfVxuXG4gIC8vIFRoZSBcInNwZWNpZmljaXR5XCIgb2YgYSBwYXRoIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoaWNoIHJvdXRlIGlzIHVzZWQgd2hlbiBtdWx0aXBsZSByb3V0ZXMgbWF0Y2hcbiAgLy8gYSBVUkwuIFN0YXRpYyBzZWdtZW50cyAobGlrZSBcIi9mb29cIikgYXJlIHRoZSBtb3N0IHNwZWNpZmljLCBmb2xsb3dlZCBieSBkeW5hbWljIHNlZ21lbnRzIChsaWtlXG4gIC8vIFwiLzppZFwiKS4gU3RhciBzZWdtZW50cyBhZGQgbm8gc3BlY2lmaWNpdHkuIFNlZ21lbnRzIGF0IHRoZSBzdGFydCBvZiB0aGUgcGF0aCBhcmUgbW9yZSBzcGVjaWZpY1xuICAvLyB0aGFuIHByb2NlZWRpbmcgb25lcy5cbiAgLy9cbiAgLy8gVGhlIGNvZGUgYmVsb3cgdXNlcyBwbGFjZSB2YWx1ZXMgdG8gY29tYmluZSB0aGUgZGlmZmVyZW50IHR5cGVzIG9mIHNlZ21lbnRzIGludG8gYSBzaW5nbGVcbiAgLy8gc3RyaW5nIHRoYXQgd2UgY2FuIHNvcnQgbGF0ZXIuIEVhY2ggc3RhdGljIHNlZ21lbnQgaXMgbWFya2VkIGFzIGEgc3BlY2lmaWNpdHkgb2YgXCIyLFwiIGVhY2hcbiAgLy8gZHluYW1pYyBzZWdtZW50IGlzIHdvcnRoIFwiMVwiIHNwZWNpZmljaXR5LCBhbmQgc3RhcnMgYXJlIHdvcnRoIFwiMFwiIHNwZWNpZmljaXR5LlxuXG4gIHZhciBsaW1pdCA9IHNlZ21lbnRzLmxlbmd0aCAtIDE7XG4gIGZvciAodmFyIGkgPSAwOyBpIDw9IGxpbWl0OyBpKyspIHtcbiAgICB2YXIgc2VnbWVudCA9IHNlZ21lbnRzW2ldLCBtYXRjaDtcblxuICAgIGlmIChpc1ByZXNlbnQobWF0Y2ggPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2gocGFyYW1NYXRjaGVyLCBzZWdtZW50KSkpIHtcbiAgICAgIHJlc3VsdHMucHVzaChuZXcgRHluYW1pY1NlZ21lbnQobWF0Y2hbMV0pKTtcbiAgICAgIHNwZWNpZmljaXR5ICs9ICcxJztcbiAgICB9IGVsc2UgaWYgKGlzUHJlc2VudChtYXRjaCA9IFJlZ0V4cFdyYXBwZXIuZmlyc3RNYXRjaCh3aWxkY2FyZE1hdGNoZXIsIHNlZ21lbnQpKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKG5ldyBTdGFyU2VnbWVudChtYXRjaFsxXSkpO1xuICAgICAgc3BlY2lmaWNpdHkgKz0gJzAnO1xuICAgIH0gZWxzZSBpZiAoc2VnbWVudCA9PSAnLi4uJykge1xuICAgICAgaWYgKGkgPCBsaW1pdCkge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihgVW5leHBlY3RlZCBcIi4uLlwiIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSBwYXRoIGZvciBcIiR7cm91dGV9XCIuYCk7XG4gICAgICB9XG4gICAgICByZXN1bHRzLnB1c2gobmV3IENvbnRpbnVhdGlvblNlZ21lbnQoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdHMucHVzaChuZXcgU3RhdGljU2VnbWVudChzZWdtZW50KSk7XG4gICAgICBzcGVjaWZpY2l0eSArPSAnMic7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsnc2VnbWVudHMnOiByZXN1bHRzLCAnc3BlY2lmaWNpdHknOiBzcGVjaWZpY2l0eX07XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hldGhlciBhIHJvdXRlIGNvbmZpZyBwYXRoIGxpa2UgYC9mb28vOmlkYCBjb2xsaWRlcyB3aXRoXG4vLyBgL2Zvby86bmFtZWBcbmZ1bmN0aW9uIHBhdGhEc2xIYXNoKHNlZ21lbnRzOiBTZWdtZW50W10pOiBzdHJpbmcge1xuICByZXR1cm4gc2VnbWVudHMubWFwKChzZWdtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBTdGFyU2VnbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcqJztcbiAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBDb250aW51YXRpb25TZWdtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gJy4uLic7XG4gICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWdtZW50IGluc3RhbmNlb2YgRHluYW1pY1NlZ21lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnOic7XG4gICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZWdtZW50IGluc3RhbmNlb2YgU3RhdGljU2VnbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlZ21lbnQucGF0aDtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgIH0pXG4gICAgICAuam9pbignLycpO1xufVxuXG5mdW5jdGlvbiBzcGxpdEJ5U2xhc2godXJsOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiB1cmwuc3BsaXQoJy8nKTtcbn1cblxudmFyIFJFU0VSVkVEX0NIQVJTID0gUmVnRXhwV3JhcHBlci5jcmVhdGUoJy8vfFxcXFwofFxcXFwpfDt8XFxcXD98PScpO1xuZnVuY3Rpb24gYXNzZXJ0UGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgaWYgKFN0cmluZ1dyYXBwZXIuY29udGFpbnMocGF0aCwgJyMnKSkge1xuICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFxuICAgICAgICBgUGF0aCBcIiR7cGF0aH1cIiBzaG91bGQgbm90IGluY2x1ZGUgXCIjXCIuIFVzZSBcIkhhc2hMb2NhdGlvblN0cmF0ZWd5XCIgaW5zdGVhZC5gKTtcbiAgfVxuICB2YXIgaWxsZWdhbENoYXJhY3RlciA9IFJlZ0V4cFdyYXBwZXIuZmlyc3RNYXRjaChSRVNFUlZFRF9DSEFSUywgcGF0aCk7XG4gIGlmIChpc1ByZXNlbnQoaWxsZWdhbENoYXJhY3RlcikpIHtcbiAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcbiAgICAgICAgYFBhdGggXCIke3BhdGh9XCIgY29udGFpbnMgXCIke2lsbGVnYWxDaGFyYWN0ZXJbMF19XCIgd2hpY2ggaXMgbm90IGFsbG93ZWQgaW4gYSByb3V0ZSBjb25maWcuYCk7XG4gIH1cbn1cblxuXG4vKipcbiAqIFBhcnNlcyBhIFVSTCBzdHJpbmcgdXNpbmcgYSBnaXZlbiBtYXRjaGVyIERTTCwgYW5kIGdlbmVyYXRlcyBVUkxzIGZyb20gcGFyYW0gbWFwc1xuICovXG5leHBvcnQgY2xhc3MgUGF0aFJlY29nbml6ZXIge1xuICBwcml2YXRlIF9zZWdtZW50czogU2VnbWVudFtdO1xuICBzcGVjaWZpY2l0eTogc3RyaW5nO1xuICB0ZXJtaW5hbDogYm9vbGVhbiA9IHRydWU7XG4gIGhhc2g6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGF0aDogc3RyaW5nKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VQYXRoU3RyaW5nKHBhdGgpO1xuXG4gICAgdGhpcy5fc2VnbWVudHMgPSBwYXJzZWRbJ3NlZ21lbnRzJ107XG4gICAgdGhpcy5zcGVjaWZpY2l0eSA9IHBhcnNlZFsnc3BlY2lmaWNpdHknXTtcbiAgICB0aGlzLmhhc2ggPSBwYXRoRHNsSGFzaCh0aGlzLl9zZWdtZW50cyk7XG5cbiAgICB2YXIgbGFzdFNlZ21lbnQgPSB0aGlzLl9zZWdtZW50c1t0aGlzLl9zZWdtZW50cy5sZW5ndGggLSAxXTtcbiAgICB0aGlzLnRlcm1pbmFsID0gIShsYXN0U2VnbWVudCBpbnN0YW5jZW9mIENvbnRpbnVhdGlvblNlZ21lbnQpO1xuICB9XG5cbiAgcmVjb2duaXplKGJlZ2lubmluZ1NlZ21lbnQ6IFVybCk6IHtba2V5OiBzdHJpbmddOiBhbnl9IHtcbiAgICB2YXIgbmV4dFNlZ21lbnQgPSBiZWdpbm5pbmdTZWdtZW50O1xuICAgIHZhciBjdXJyZW50U2VnbWVudDogVXJsO1xuICAgIHZhciBwb3NpdGlvbmFsUGFyYW1zID0ge307XG4gICAgdmFyIGNhcHR1cmVkID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NlZ21lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB2YXIgc2VnbWVudCA9IHRoaXMuX3NlZ21lbnRzW2ldO1xuXG4gICAgICBjdXJyZW50U2VnbWVudCA9IG5leHRTZWdtZW50O1xuICAgICAgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBDb250aW51YXRpb25TZWdtZW50KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNQcmVzZW50KGN1cnJlbnRTZWdtZW50KSkge1xuICAgICAgICAvLyB0aGUgc3RhciBzZWdtZW50IGNvbnN1bWVzIGFsbCBvZiB0aGUgcmVtYWluaW5nIFVSTCwgaW5jbHVkaW5nIG1hdHJpeCBwYXJhbXNcbiAgICAgICAgaWYgKHNlZ21lbnQgaW5zdGFuY2VvZiBTdGFyU2VnbWVudCkge1xuICAgICAgICAgIHBvc2l0aW9uYWxQYXJhbXNbc2VnbWVudC5uYW1lXSA9IGN1cnJlbnRTZWdtZW50LnRvU3RyaW5nKCk7XG4gICAgICAgICAgY2FwdHVyZWQucHVzaChjdXJyZW50U2VnbWVudC50b1N0cmluZygpKTtcbiAgICAgICAgICBuZXh0U2VnbWVudCA9IG51bGw7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjYXB0dXJlZC5wdXNoKGN1cnJlbnRTZWdtZW50LnBhdGgpO1xuXG4gICAgICAgIGlmIChzZWdtZW50IGluc3RhbmNlb2YgRHluYW1pY1NlZ21lbnQpIHtcbiAgICAgICAgICBwb3NpdGlvbmFsUGFyYW1zW3NlZ21lbnQubmFtZV0gPSBjdXJyZW50U2VnbWVudC5wYXRoO1xuICAgICAgICB9IGVsc2UgaWYgKCFzZWdtZW50Lm1hdGNoKGN1cnJlbnRTZWdtZW50LnBhdGgpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBuZXh0U2VnbWVudCA9IGN1cnJlbnRTZWdtZW50LmNoaWxkO1xuICAgICAgfSBlbHNlIGlmICghc2VnbWVudC5tYXRjaCgnJykpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybWluYWwgJiYgaXNQcmVzZW50KG5leHRTZWdtZW50KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHVybFBhdGggPSBjYXB0dXJlZC5qb2luKCcvJyk7XG5cbiAgICB2YXIgYXV4aWxpYXJ5O1xuICAgIHZhciB1cmxQYXJhbXM7XG4gICAgdmFyIGFsbFBhcmFtcztcbiAgICBpZiAoaXNQcmVzZW50KGN1cnJlbnRTZWdtZW50KSkge1xuICAgICAgLy8gSWYgdGhpcyBpcyB0aGUgcm9vdCBjb21wb25lbnQsIHJlYWQgcXVlcnkgcGFyYW1zLiBPdGhlcndpc2UsIHJlYWQgbWF0cml4IHBhcmFtcy5cbiAgICAgIHZhciBwYXJhbXNTZWdtZW50ID0gYmVnaW5uaW5nU2VnbWVudCBpbnN0YW5jZW9mIFJvb3RVcmwgPyBiZWdpbm5pbmdTZWdtZW50IDogY3VycmVudFNlZ21lbnQ7XG5cbiAgICAgIGFsbFBhcmFtcyA9IGlzUHJlc2VudChwYXJhbXNTZWdtZW50LnBhcmFtcykgP1xuICAgICAgICAgICAgICAgICAgICAgIFN0cmluZ01hcFdyYXBwZXIubWVyZ2UocGFyYW1zU2VnbWVudC5wYXJhbXMsIHBvc2l0aW9uYWxQYXJhbXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbmFsUGFyYW1zO1xuXG4gICAgICB1cmxQYXJhbXMgPSBzZXJpYWxpemVQYXJhbXMocGFyYW1zU2VnbWVudC5wYXJhbXMpO1xuXG5cbiAgICAgIGF1eGlsaWFyeSA9IGN1cnJlbnRTZWdtZW50LmF1eGlsaWFyeTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWxsUGFyYW1zID0gcG9zaXRpb25hbFBhcmFtcztcbiAgICAgIGF1eGlsaWFyeSA9IFtdO1xuICAgICAgdXJsUGFyYW1zID0gW107XG4gICAgfVxuICAgIHJldHVybiB7dXJsUGF0aCwgdXJsUGFyYW1zLCBhbGxQYXJhbXMsIGF1eGlsaWFyeSwgbmV4dFNlZ21lbnR9O1xuICB9XG5cblxuICBnZW5lcmF0ZShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIHZhciBwYXJhbVRva2VucyA9IG5ldyBUb3VjaE1hcChwYXJhbXMpO1xuXG4gICAgdmFyIHBhdGggPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBzZWdtZW50ID0gdGhpcy5fc2VnbWVudHNbaV07XG4gICAgICBpZiAoIShzZWdtZW50IGluc3RhbmNlb2YgQ29udGludWF0aW9uU2VnbWVudCkpIHtcbiAgICAgICAgcGF0aC5wdXNoKHNlZ21lbnQuZ2VuZXJhdGUocGFyYW1Ub2tlbnMpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIHVybFBhdGggPSBwYXRoLmpvaW4oJy8nKTtcblxuICAgIHZhciBub25Qb3NpdGlvbmFsUGFyYW1zID0gcGFyYW1Ub2tlbnMuZ2V0VW51c2VkKCk7XG4gICAgdmFyIHVybFBhcmFtcyA9IHNlcmlhbGl6ZVBhcmFtcyhub25Qb3NpdGlvbmFsUGFyYW1zKTtcblxuICAgIHJldHVybiB7dXJsUGF0aCwgdXJsUGFyYW1zfTtcbiAgfVxufVxuIl19