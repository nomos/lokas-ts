import {util} from "./util";

export namespace StringUtil {
    export function hasExt(str, ext) {
        str=str.split('.');
        str=str[str.length-1];
        ext=ext.split('.');
        ext=ext[ext.length-1];
        return str===ext;
    }
    export function getFileName(path) {
        path=this.getFileNameWithExt(path);
        path=path.split('.');
        return path[0];
    }
    export function getFileNameWithExt(path) {
        path=path.split('/');
        return path[path.length-1];
    }
    export function getDirectory(path) {
        if (path[path.length-1]==='/') {
            return path;
        }
        let lastIndex=path.lastIndexOf('/');
        return path.substr(0, lastIndex);
    }
    export function getFileExt(path) {
        path=this.getFileNameWithExt(path);
        path=path.split('.');
        return path.length>1 ? path[1]:'';
    }
    export function replaceParams(str,pattern,arr) {
        let args = [].slice.call(arguments);
        let vars = [];
        if (util.isArray(pattern)) {
            vars = pattern;
            pattern = '%s';
        } else {
            if (util.isString(pattern)) {
                if (pattern.length===2&&pattern[0]==='%') {
                    if (util.isArray(arr)) {
                        vars = arr;
                    } else {
                        vars = args.slice(2);
                    }
                } else {
                    vars = args.slice(1);
                    pattern = '%s';
                }
            } else {
                vars = args.slice(1);
                pattern = '%s';

            }
        }
        for (let i=0;i<vars.length;i++) {
            str = str.replace(pattern,String(vars[i]));
        }
        return str;
    }
    export function ltrimString(str) {
        return str.replace(/(^\s*)|(\s*$)/g, '');
    }
    export function rtrimString(str) {
        return str.replace(/(\s*$)/g, '');
    }
}

