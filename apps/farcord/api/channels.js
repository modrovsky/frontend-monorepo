const WARPCAST_CHANNELS_STATIC_LIST =
  "https://api.warpcast.com/v2/all-channels";

const WARPCAST_CHANNELS_INFO_ENDPOINT =
  "https://client.warpcast.com/v2/channel";

import { readFileSync, readdirSync } from "fs";

export default async function handler(_, response) {
  let fileChannels = [];

  try {
    console.log("listing files in current directory");
    readdirSync(process.cwd()).forEach((file) => {
      console.log(file);
    });

    console.log("listing files in previous directory");
    readdirSync("../").forEach((file) => {
      console.log(file);
    });

    const stringified = readFileSync("../static/all-channels.json", "utf8");

    if (stringified) {
      fileChannels = JSON.parse(stringified);
    }
  } catch (e) {
    console.error("Error reading backup JSON file: ", e);
  }

  const fileChannelsById = fileChannels.reduce((acc, channel) => {
    acc[channel.id] = channel;
    return acc;
  }, {});

  const channels = await fetch(WARPCAST_CHANNELS_STATIC_LIST)
    .then(async (res) => {
      if (res.ok) return res.json();
      return Promise.reject(new Error(res.statusText));
    })
    .then(async (data) => {
      const channels = data?.result?.channels;
      if (!channels) return [];

      return Promise.all(
        channels.map((channel) => {
          // avoid fetching if channel id and url are already in the backup
          if (fileChannelsById?.[channel.id]?.url === channel.url) {
            return fileChannelsById[channel.id];
          }

          return fetch(WARPCAST_CHANNELS_INFO_ENDPOINT + "?key=" + channel.id)
            .then((res) => {
              if (res.ok) return res.json();
              else {
                throw new Error(res.statusText);
              }
            })
            .then((body) => {
              if (!body) return;
              const warpcastChannel = body.result.channel;
              return {
                id: channel.id,
                parentUrl: channel.url,
                name: warpcastChannel.name,
                imageUrl: warpcastChannel.fastImageUrl,
                followerCount: warpcastChannel.followerCount,
                description: warpcastChannel.description,
              };
            })
            .catch((e) => {
              console.error("Error fetching channel info for " + channel.id, e);
              return null;
            });
        })
      ).then((result) => {
        // filter undefined keys
        return result.filter((c) => c);
      });
    })
    .catch((e) => {
      console.error("Error fetching warpcast channels, using JSON backup: ", e);

      return [];
    });

  response.setHeader("Cache-Control", "s-maxage=86400");
  response.status(200).json({ channels: channels });
}
