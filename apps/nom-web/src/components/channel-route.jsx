import React from "react";
import { useParams } from "react-router-dom";
import { Helmet as ReactHelmet } from "react-helmet";
import { useChannel, useChannelName, useAuth } from "@shades/common/app";
import { getImageDimensionsFromUrl } from "@shades/common/utils";
import useLayoutSetting from "../hooks/layout-setting.js";
import Channel from "./channel";

const ChannelRoute = (props) => {
  const params = useParams();
  const { status } = useAuth();
  const layout = useLayoutSetting();
  if (status === "loading") return null;
  return (
    <>
      <MetaTags channelId={params.channelId} />
      <Channel channelId={params.channelId} {...props} layout={layout} />
    </>
  );
};

const MetaTags = ({ channelId }) => {
  const channel = useChannel(channelId);
  const name = useChannelName(channelId);

  const [imageDimensions, setImageDimensions] = React.useState(null);

  React.useEffect(() => {
    if (channel?.image == null) {
      setImageDimensions(null);
      return;
    }

    getImageDimensionsFromUrl(channel.image).then((dimensions) => {
      setImageDimensions(dimensions);
    });
  }, [channel?.image]);

  if (channel == null) return null;

  return (
    <ReactHelmet>
      <link
        rel="canonical"
        href={`https://app.nom.xyz/channels/${channelId}`}
      />

      <title>{`${name} - NOM`}</title>
      <meta name="description" content={channel.description} />

      <meta property="og:title" content={name} />
      <meta property="og:description" content={channel.description} />

      {channel.image != null && (
        <meta property="og:image" content={channel.image} />
      )}

      {imageDimensions != null && (
        <meta property="og:image:width" content={imageDimensions.width} />
      )}
      {imageDimensions != null && (
        <meta property="og:image:height" content={imageDimensions.height} />
      )}
    </ReactHelmet>
  );
};

export default ChannelRoute;
