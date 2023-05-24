import React from "react";
import { useAuth, useActions, useMe, useChannel } from "@shades/common/app";
import useInterval from "./interval";
import useFetch from "./fetch";
import useChannelMessagesFetcher from "./channel-messages-fetcher.js";

const useChannelFetchEffects = (channelId) => {
  const { status: authenticationStatus } = useAuth();
  const actions = useActions();

  const {
    fetchChannelMembers,
    fetchChannelPermissions,
    fetchChannelPublicPermissions,
    fetchApps,
  } = actions;

  const me = useMe();
  const channel = useChannel(channelId);

  const isMember =
    me != null &&
    channel != null &&
    channel.memberUserIds.some((id) => id === me.id);

  const fetchMessages = useChannelMessagesFetcher(channelId);

  useFetch(
    () =>
      fetchChannelMembers(channelId).catch(() => {
        // Ignore
      }),
    [channelId, fetchChannelMembers, authenticationStatus]
  );
  useFetch(
    () => fetchChannelPublicPermissions(channelId),
    [channelId, fetchChannelPublicPermissions, authenticationStatus]
  );
  useFetch(
    () =>
      authenticationStatus === "authenticated"
        ? fetchChannelPermissions(channelId)
        : undefined,
    [channelId, fetchChannelPermissions, authenticationStatus]
  );
  useFetch(
    authenticationStatus === "not-authenticated"
      ? () => fetchApps(channelId)
      : undefined,
    [channelId, authenticationStatus]
  );

  React.useEffect(() => {
    fetchMessages({ limit: 30 }).catch(() => {
      // Ignore
    });
  }, [fetchMessages, authenticationStatus]);

  useInterval(
    () => {
      fetchMessages({ limit: 20 }).catch(() => {
        // Ignore
      });
    },
    {
      // Only long-poll fetch when user is logged out, or when not a member
      delay:
        authenticationStatus === "not-authenticated" ||
        (me != null && !isMember)
          ? 5000
          : 0,
      requireFocus: true,
      requireOnline: true,
    }
  );
};

export default useChannelFetchEffects;
