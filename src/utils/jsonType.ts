import { Respond } from "../core";

export interface HasToJSON {
    toJSON: () => BasicJSONTypes | JsonArray | JsonObject;
}
export type BasicJSONTypes = string | number | boolean | null;
export type JsonObject = {
    [key: string | number]: JsonType;
};
export type JsonArray = JsonType[];
/**
 * JSON type is something that can be serialize with JSON.stringify without
 * dropping anything.
 */
export type JsonType = JsonObject | JsonArray | BasicJSONTypes | HasToJSON;

/**
 * Return something can be defined as json.
 *
 * @param json the json content you'd like to send.
 * @returns Respond with json content
 */
export const resJson = <T extends JsonType>(json: T): Respond<T> => {
    return [json, 200];
};
