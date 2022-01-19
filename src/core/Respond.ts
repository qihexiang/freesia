import { statusMessage, validHttpStatusCode } from "./http";
import Stream from "stream";

export type Headers = {
    [propName: string]: string | number | string[];
};

export interface ResponseProps {
    statusCode: validHttpStatusCode,
    statusMessage: string,
    body?: ResponseBody,
    headers: Headers;
}

export type ResponseBody = string | Buffer | Stream;

export type AsyncResponse = ResponseProps | Promise<ResponseProps>;

export class Respond implements ResponseProps {
    private _statusCode?: validHttpStatusCode = undefined;
    private _statusMessage?: string = undefined;
    private _body?: ResponseBody = undefined;
    private _headers: Headers = {};
    /**
     * Create an empty response, default status code is 404.
     */
    static create(): Respond;
    /**
     * Create an empty response with given status code.
     * 
     * @param code http status code.
     */
    static create(code: validHttpStatusCode): Respond;
    /**
     * Create a response with given body, default status code is 200.
     * 
     * @param body a string, buffer or stream.
     */
    static create(body: ResponseBody): Respond;
    /**
     * Create a response with given status code and body.
     * 
     * @param code http status code.
     * @param body a string, buffer or stream.
     */
    static create(code: validHttpStatusCode, body: ResponseBody): Respond;
    /**
     * Create a response with given status code and headers.
     * 
     * @param code http status code.
     * @param headers http headers like `"Content-Type"`.
     */
    static create(code: validHttpStatusCode, headers: Headers): Respond;
    /**
     * Create a response with given body and headers, default status code is 200.
     * 
     * @param body a string, buffer or stream.
     * @param headers http headers like `"Content-Type"`.
     */
    static create(body: ResponseBody, headers: Headers): Respond;
    /**
     * Create a response with given status code, body and http headers.
     * 
     * @param code http status code.
     * @param body a string, buffer or stream.
     * @param headers http headers like `"Content-Type"`.
     */
    static create(code: validHttpStatusCode, body: ResponseBody, headers: Headers): Respond;
    static create(arg1?: validHttpStatusCode | ResponseBody, arg2?: ResponseBody | Headers, headers?: Headers): Respond {
        const response = new Respond();
        if (typeof arg1 === "number") {
            response.setStatusCode(arg1);
            if (typeof arg2 === "string" || arg2 instanceof Buffer || arg2 instanceof Stream) response.setBody(arg2);
            else if (typeof arg2 === "object") response.setHeaders(arg2);
        }
        if (typeof arg1 === "string" || arg1 instanceof Buffer || arg1 instanceof Stream) {
            response.setBody(arg1);
            if (typeof arg2 === "object") response.setHeaders(arg2 as Headers);
        }
        if (headers) response.setHeaders(headers);
        return response;
    }
    /**
     * Set status code manually
     * 
     * @param code a valid http status code
     * @returns this instance itself
     */
    setStatusCode(code: validHttpStatusCode): Respond {
        this._statusCode = code;
        return this;
    }
    get statusCode(): validHttpStatusCode {
        return this._statusCode ?? (this._body ? 200 : 404);
    }
    /**
     * Set a status message manually.
     * 
     * > Don't forget that this dosen't work in HTTP/2
     * 
     * @param message a status message in string type
     * @returns this instance itself
     */
    setStatusMessage(message: string): Respond {
        this._statusMessage = message;
        return this;
    }
    get statusMessage(): string {
        return this._statusMessage ?? statusMessage[this.statusCode];
    }
    /**
     * Set a response body, it can be a readable stream, a buffer or a string.
     * 
     * If you'd like to response a json, using JSON.stringify to transfrom it.
     * 
     * @param body the body you'd like to response.
     * @returns this instance it self
     */
    setBody(body: ResponseBody): Respond {
        this._body = body;
        return this;
    }
    get body(): ResponseBody | undefined {
        return this._body;
    }
    /**
     * Set headers of response. You can call this method many times, and it will
     * merge them all.
     * 
     * For example:
     * 
     * ```js
     * res.setHeaders({"Content-Type": "application/json"}).setHeaders({"Access-Control-Allow-Origin": "*"})
     * 
     * res.setHeaders({"Content-Type": "application/json"}, {"Access-Control-Allow-Origin": "*"})
     * 
     * res.setHeaders({"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})
     * ```
     * 
     * are all equal. Properties later to be received would cover the earlier one with the same key.
     * 
     * @param headers HTTP headers.
     * @returns this instance it self.
     */
    setHeaders(...headers: Headers[]): Respond {
        this._headers = { ...this._headers, ...headers.reduce((pre, cur) => ({ ...pre, ...cur }), {}) };
        return this;
    }
    get headers(): Headers {
        return this._headers;
    }
}

export const createRes = Respond.create;

export default createRes;