/*
 * Spotify Controller GNOME Extension
 * Copyright (C) 2026 NarkAgni
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


try {
    imports.gi.versions.Soup = '2.4';
} catch (_) {}

const { Soup } = imports.gi;


/**
 * Perform an HTTP GET request using libsoup 2.4 and resolve with status and bytes.
 *
 * @param {Soup.Session} session
 * @param {string} url
 * @param {Record<string, string>} [headers]
 * @returns {Promise<{ statusCode: number, data: Uint8Array }>}
 */
var httpGet = function (session, url, headers = {}) {
    return new Promise((resolve, reject) => {
        const msg = Soup.Message.new('GET', url);
        if (!msg) {
            reject(new Error(`Invalid URL: ${url}`));
            return;
        }

        for (const [name, value] of Object.entries(headers))
            msg.request_headers.append(name, value);

        session.queue_message(msg, (_sess, message) => {
            try {
                const bytes = message.response_body.flatten().get_as_bytes();
                resolve({
                    statusCode: message.status_code,
                    data: bytes ? bytes.get_data() : new Uint8Array(),
                });
            } catch (e) {
                reject(e);
            }
        });
    });
};
