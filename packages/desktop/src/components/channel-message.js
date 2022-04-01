import React from "react";
import { FormattedDate } from "react-intl";
import { css, useTheme } from "@emotion/react";
import { useAuth, arrayUtils, objectUtils, messageUtils } from "@shades/common";
import useHover from "../hooks/hover";
import { isNodeEmpty, normalizeNodes, cleanNodes } from "../slate/utils";
import {
  DotsHorizontal as DotsHorizontalIcon,
  EditPen as EditPenIcon,
  ReplyArrow as ReplyArrowIcon,
} from "./icons";
import MessageInput from "./message-input";
import RichText from "./rich-text";
import Button from "./button";
import ServerMemberAvatar from "./server-member-avatar";
import * as Popover from "./popover";
import * as DropdownMenu from "./dropdown-menu";
import * as Toolbar from "./toolbar";
import * as Tooltip from "./tooltip";
import { AddEmojiReaction as AddEmojiReactionIcon } from "./icons";

const { groupBy } = arrayUtils;
const { mapValues } = objectUtils;
const { withoutAttachments } = messageUtils;

const ONE_MINUTE_IN_MILLIS = 1000 * 60;

const ChannelMessage = ({
  isDM,
  authorNick,
  authorWalletAddress,
  authorUserId,
  serverId,
  authorOnlineStatus,
  previousMessage,
  avatarVerified,
  content,
  createdAt,
  reactions = [],
  hasPendingReply,
  isReply,
  repliedMessage,
  isEdited,
  canEditMessage,
  initReply,
  addReaction,
  removeReaction,
  update,
  remove,
  members,
  selectChannelMemberWithUserId,
  getUserMentionDisplayName,
  sendDirectMessageToAuthor,
}) => {
  const inputRef = React.useRef();
  const containerRef = React.useRef();

  const { user } = useAuth();

  const [isHovering, hoverHandlers] = useHover();
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const [isEditing, setEditingMessage] = React.useState(false);

  const [isInlineEmojiPickerOpen, setInlineEmojiPickerOpen] =
    React.useState(false);

  const theme = useTheme();

  const showAsFocused =
    !isEditing && (isHovering || isDropdownOpen || isEmojiPickerOpen);

  const isOwnMessage = user.id === authorUserId;

  const showSimplifiedMessage =
    !isReply &&
    previousMessage != null &&
    previousMessage.authorUserId === authorUserId &&
    createdAt - new Date(previousMessage.created_at) < 5 * ONE_MINUTE_IN_MILLIS;

  React.useEffect(() => {
    if (!isEditing) return;

    inputRef.current.focus();
    containerRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isEditing]);

  return (
    <div
      ref={containerRef}
      style={{
        background: hasPendingReply
          ? "#3f42ea2b"
          : showAsFocused
          ? theme.colors.messageHoverBackground
          : undefined,
      }}
      css={css({
        position: "relative",
        lineHeight: 1.46668,
        padding: showSimplifiedMessage
          ? "0.5rem 1.6rem"
          : "0.7rem 1.6rem 0.3rem",
        userSelect: "text",
      })}
      {...hoverHandlers}
    >
      <div
        css={css({
          position: "absolute",
          top: 0,
          right: "1.6rem",
          transform: "translateY(-50%)",
          display: showAsFocused ? "block" : "none",
          zIndex: 1,
        })}
      >
        <MessageToolbar
          isOwnMessage={isOwnMessage}
          canEditMessage={canEditMessage}
          initReply={initReply}
          startEditMode={() => {
            setEditingMessage(true);
          }}
          addReaction={(emoji) => {
            addReaction(emoji);
            setEmojiPickerOpen(false);
          }}
          onDropdownOpenChange={(isOpen) => {
            setDropdownOpen(isOpen);
          }}
          isEmojiPickerOpen={isEmojiPickerOpen}
          onEmojiPickerOpenChange={(isOpen) => {
            setEmojiPickerOpen(isOpen);
          }}
          dropdownItems={[
            { onSelect: initReply, label: "Reply" },
            { disabled: true, label: "Mark unread" },
            canEditMessage && {
              onSelect: () => {
                setEditingMessage(true);
              },
              label: "Edit message",
            },
            canEditMessage && {
              onSelect: () => {
                if (confirm("Are you sure you want to remove this message?"))
                  remove();
              },
              label: "Delete message",
              style: { color: "#ff5968" },
            },
            { type: "separator" },
            !isOwnMessage &&
              !(isDM && members.length <= 2) && {
                onSelect: sendDirectMessageToAuthor,
                label: "Send direct message",
              },
            {
              onSelect: () => {
                navigator.clipboard.writeText(authorWalletAddress);
              },
              label: "Copy user wallet address",
            },
          ].filter(Boolean)}
        />
      </div>

      {isReply && (
        <RepliedMessage
          message={repliedMessage}
          getUserMentionDisplayName={getUserMentionDisplayName}
        />
      )}
      <div
        css={css`
          display: grid;
          grid-template-columns: 3.8rem minmax(0, 1fr);
          align-items: flex-start;
          grid-gap: 1.2rem;
        `}
      >
        {showSimplifiedMessage ? (
          <div
            css={css({
              paddingTop: "0.5rem",
              textAlign: "right",
              transition: "0.15s opacity",
            })}
            style={{ opacity: isHovering ? 1 : 0 }}
          >
            <TinyMutedText nowrap>
              <FormattedDate
                value={createdAt}
                hour="numeric"
                minute="numeric"
              />
            </TinyMutedText>
          </div>
        ) : (
          <div css={css({ padding: "0.2rem 0 0" })}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  css={css({
                    position: "relative",
                    borderRadius: "0.3rem",
                    overflow: "hidden",
                    cursor: "pointer",
                    ":hover": {
                      boxShadow: avatarVerified
                        ? "0 0 0 2px #4f52ff"
                        : "0 0 0 2px rgb(255 255 255 / 10%)",
                    },
                    ":active": { transform: "translateY(0.1rem)" },
                  })}
                  onClick={() => {
                    alert(
                      `Congratulations, you clicked ${authorNick}’s avatar!`
                    );
                  }}
                >
                  <ServerMemberAvatar
                    userId={authorUserId}
                    serverId={serverId}
                    size="3.8rem"
                  />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                side="top"
                sideOffset={6}
                css={css({ padding: "0.4rem", borderRadius: "0.6rem" })}
              >
                {avatarVerified && (
                  <div
                    css={(theme) =>
                      css({
                        fontSize: "1rem",
                        margin: "0 0 0.3rem",
                        color: theme.colors.textNormal,
                      })
                    }
                  >
                    NFT verified
                  </div>
                )}
                <ServerMemberAvatar
                  userId={authorUserId}
                  serverId={serverId}
                  size="6.4rem"
                />
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
        )}
        <div>
          {!showSimplifiedMessage && (
            <div
              css={css`
                display: grid;
                grid-template-columns: repeat(2, minmax(0, auto));
                justify-content: flex-start;
                align-items: flex-end;
                grid-gap: 1.2rem;
                margin: 0 0 0.2rem;
                cursor: default;
              `}
            >
              <div css={css({ display: "flex", alignItems: "center" })}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      css={(theme) =>
                        css({
                          lineHeight: 1.2,
                          color: theme.colors.pink,
                          fontWeight: "500",
                          cursor: "pointer",
                          ":hover": {
                            textDecoration: "underline",
                          },
                        })
                      }
                      onClick={() => {
                        alert(`Congratulations, you clicked ${authorNick}!`);
                      }}
                    >
                      {authorNick}
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" sideOffset={4}>
                    <span css={css({ color: "rgb(255 255 255 / 54%)" })}>
                      {authorWalletAddress}
                    </span>
                  </Tooltip.Content>
                </Tooltip.Root>

                {authorOnlineStatus === "online" && (
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <div
                        css={css({ padding: "0.4rem", marginLeft: "0.3rem" })}
                      >
                        <div
                          css={(theme) =>
                            css({
                              width: "0.7rem",
                              height: "0.7rem",
                              borderRadius: "50%",
                              background: theme.colors.onlineIndicator,
                            })
                          }
                        />
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="top" align="center" sideOffset={4}>
                      <span css={css({ color: "rgb(255 255 255 / 54%)" })}>
                        User online
                      </span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>

              <TinyMutedText>
                <FormattedDate
                  value={createdAt}
                  hour="numeric"
                  minute="numeric"
                  day="numeric"
                  month="short"
                />
              </TinyMutedText>
            </div>
          )}

          {isEditing ? (
            <EditMessageInput
              ref={inputRef}
              blocks={content}
              onCancel={() => {
                setEditingMessage(false);
              }}
              remove={remove}
              save={(content) =>
                update(content).then((message) => {
                  setEditingMessage(false);
                  return message;
                })
              }
              members={members}
              getUserMentionDisplayName={getUserMentionDisplayName}
            />
          ) : (
            <RichText
              blocks={content}
              onClickInteractiveElement={(el) => {
                switch (el.type) {
                  case "user": {
                    const mentionDisplayName = getUserMentionDisplayName(
                      el.ref
                    );
                    alert(
                      `Congratulations, you clicked "@${mentionDisplayName}"!`
                    );
                    break;
                  }
                  case "image-attachment":
                    window.open(el.url, "_blank");
                    break;
                  default:
                    throw new Error();
                }
              }}
              getUserMentionDisplayName={getUserMentionDisplayName}
            >
              {isEdited && (
                <span
                  css={css({
                    fontSize: "1rem",
                    color: "rgb(255 255 255 / 35%)",
                  })}
                >
                  (edited)
                </span>
              )}
            </RichText>
          )}

          {reactions.length !== 0 && (
            <div
              css={css({
                display: "grid",
                gridAutoFlow: "column",
                gridAutoColumns: "auto",
                gridGap: "0.4rem",
                justifyContent: "flex-start",
                margin: "0.5rem -1px 0",
                button: {
                  display: "flex",
                  alignItems: "center",
                  height: "2.5rem",
                  fontSize: "1.5rem",
                  background: "rgb(255 255 255 / 4%)",
                  borderRadius: "0.7rem",
                  padding: "0 0.7rem 0 0.6rem",
                  lineHeight: 1,
                  userSelect: "none",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  "&.active": {
                    background: "#3f42ea45",
                    borderColor: "#4c4ffe96",
                  },
                  "&:not(.active):hover": {
                    borderColor: "rgb(255 255 255 / 20%)",
                  },
                  ".count": {
                    fontSize: "1rem",
                    fontWeight: "400",
                    color: "rgb(255 255 255 / 70%)",
                    marginLeft: "0.5rem",
                  },
                },
              })}
            >
              {reactions.map((r) => {
                const isLoggedInUserReaction = r.users.includes(user.id);
                const authorDisplayNames = r.users
                  .map(selectChannelMemberWithUserId)
                  .map((m) => m.displayName);
                return (
                  <Tooltip.Root key={r.emoji}>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={() => {
                          if (isLoggedInUserReaction) {
                            removeReaction(r.emoji);
                            return;
                          }

                          addReaction(r.emoji);
                        }}
                        className={
                          isLoggedInUserReaction ? "active" : undefined
                        }
                      >
                        <span>{r.emoji}</span>
                        <span className="count">{r.count}</span>
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="top"
                      sideOffset={4}
                      style={{ borderRadius: "0.5rem" }}
                    >
                      <div
                        css={css({
                          display: "grid",
                          gridTemplateColumns: "auto minmax(0,auto)",
                          gridGap: "0.8rem",
                          alignItems: "center",
                          padding: "0 0.4rem 0 0.2rem",
                          lineHeight: 1.4,
                          maxWidth: "24rem",
                        })}
                      >
                        <div
                          css={css({ fontSize: "2.8rem", lineHeight: "1.1" })}
                        >
                          {r.emoji}
                        </div>
                        <div
                          css={css({
                            hyphens: "auto",
                            wordBreak: "break-word",
                            padding: "0.2rem 0",
                          })}
                        >
                          {[
                            authorDisplayNames.slice(0, -1).join(", "),
                            authorDisplayNames.slice(-1)[0],
                          ]
                            .filter(Boolean)
                            .join(" and ")}{" "}
                          reacted
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                );
              })}

              <Popover.Root
                open={isInlineEmojiPickerOpen}
                onOpenChange={(isOpen) => {
                  setInlineEmojiPickerOpen(isOpen);
                }}
              >
                <Popover.Trigger asChild>
                  <button
                    css={css({
                      color: "white",
                      border: "1px solid white",
                      transition: "0.1s opacity ease-out",
                      svg: { width: "1.6rem", height: "auto" },
                    })}
                    style={{ opacity: isHovering ? 1 : 0 }}
                  >
                    <AddEmojiReactionIcon />
                  </button>
                </Popover.Trigger>
                <Popover.Content
                  side="top"
                  align="center"
                  sideOffset={4}
                  style={{
                    width: "31.6rem",
                    height: "28.4rem",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Popover.Arrow />
                  <EmojiPicker
                    addReaction={(...args) => {
                      setInlineEmojiPickerOpen(false);
                      return addReaction(...args);
                    }}
                  />
                </Popover.Content>
              </Popover.Root>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Super hacky and inaccessible
const EmojiPicker = ({ addReaction }) => {
  const inputRef = React.useRef();

  const [emojiData, setEmojiData] = React.useState([]);

  const emojis = React.useMemo(
    () =>
      groupBy(
        (e) => e.category,
        emojiData.filter((e) => parseFloat(e.unicode_version) < 13)
      ),
    [emojiData]
  );

  const [highlightedEntry, setHighlightedEntry] = React.useState(null);

  const [query, setQuery] = React.useState("");
  const trimmedQuery = query.trim().toLowerCase();

  const filteredEmojisByCategoryEntries = React.useMemo(() => {
    const match = (e) =>
      [e.description.toLowerCase(), ...e.aliases, ...e.tags].some((prop) =>
        prop.includes(trimmedQuery)
      );

    return Object.entries(mapValues((es) => es.filter(match), emojis)).filter(
      (entry) => entry[1].length !== 0
    );
  }, [emojis, trimmedQuery]);

  const highlightedEmojiItem =
    highlightedEntry == null
      ? null
      : filteredEmojisByCategoryEntries[highlightedEntry[0]][1][
          highlightedEntry[1]
        ];

  const ROW_LENGTH = 9;

  const addReactionAtEntry = ([ci, ei]) => {
    const { emoji } = filteredEmojisByCategoryEntries[ci][1][ei];
    addReaction(emoji);
  };

  const navigationBlockedRef = React.useRef();

  // Hack to make the UI not freeze when you navigate by pressing and holding e.g. arrow down
  const wrapNavigationKeydownHandler = (handler) => {
    if (navigationBlockedRef.current) return;
    navigationBlockedRef.current = true;
    handler();
    requestAnimationFrame(() => {
      navigationBlockedRef.current = false;
    });
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case "ArrowUp": {
        wrapNavigationKeydownHandler(() => {
          setHighlightedEntry((e) => {
            if (e == null) return null;
            const [ci, ei] = e;
            if (ei - ROW_LENGTH >= 0) return [ci, ei - ROW_LENGTH];
            if (ci === 0) return null;
            const targetColumn = ei;
            const previousCategoryItems =
              filteredEmojisByCategoryEntries[ci - 1][1];
            const lastRowLength =
              previousCategoryItems.length % ROW_LENGTH === 0
                ? ROW_LENGTH
                : previousCategoryItems.length % ROW_LENGTH;
            return [
              ci - 1,
              lastRowLength - 1 >= targetColumn
                ? previousCategoryItems.length - lastRowLength + targetColumn
                : previousCategoryItems.length - 1,
            ];
          });
          event.preventDefault();
        });
        break;
      }
      case "ArrowDown": {
        wrapNavigationKeydownHandler(() => {
          setHighlightedEntry((e) => {
            if (filteredEmojisByCategoryEntries.length === 0) return null;
            if (e == null) return [0, 0];
            const [ci, ei] = e;
            const categoryItems = filteredEmojisByCategoryEntries[ci][1];
            if (ei + ROW_LENGTH <= categoryItems.length - 1)
              return [ci, ei + ROW_LENGTH];
            const lastRowStartIndex =
              categoryItems.length % ROW_LENGTH === 0
                ? categoryItems.length - ROW_LENGTH
                : categoryItems.length - (categoryItems.length % ROW_LENGTH);

            if (ei < lastRowStartIndex) return [ci, categoryItems.length - 1];
            if (ci === filteredEmojisByCategoryEntries.length - 1)
              return [ci, ei];
            const targetColumn = ei % ROW_LENGTH;
            const nextCategoryItems =
              filteredEmojisByCategoryEntries[ci + 1][1];
            return [
              ci + 1,
              nextCategoryItems.length - 1 >= targetColumn
                ? targetColumn
                : nextCategoryItems.length - 1,
            ];
          });
          event.preventDefault();
        });
        break;
      }
      case "ArrowLeft": {
        wrapNavigationKeydownHandler(() => {
          setHighlightedEntry((e) => {
            if (e == null) return null;
            const [ci, ei] = e;
            if (ei - 1 >= 0) return [ci, ei - 1];
            if (ci === 0) {
              const categoryItems = filteredEmojisByCategoryEntries[ci][1];
              return [
                ci,
                categoryItems.length >= ROW_LENGTH
                  ? ROW_LENGTH - 1
                  : categoryItems.length - 1,
              ];
            }
            const previousCategoryItems =
              filteredEmojisByCategoryEntries[ci - 1][1];
            return [ci - 1, previousCategoryItems.length - 1];
          });
          event.preventDefault();
        });
        break;
      }
      case "ArrowRight": {
        wrapNavigationKeydownHandler(() => {
          setHighlightedEntry((e) => {
            if (e == null) return null;
            const [ci, ei] = e;
            const categoryItems = filteredEmojisByCategoryEntries[ci][1];
            if (ei + 1 <= categoryItems.length - 1) return [ci, ei + 1];
            if (ci === filteredEmojisByCategoryEntries.length - 1)
              return [ci, ei];
            return [ci + 1, 0];
          });
          event.preventDefault();
        });
        break;
      }
      case "Enter": {
        addReactionAtEntry(highlightedEntry);
        event.preventDefault();
        break;
      }
    }
  };

  React.useEffect(() => {
    inputRef.current.focus();
  }, []);

  React.useEffect(() => {
    import("../emojis").then(({ default: emojis }) => {
      setEmojiData(emojis);
    });
  });

  return (
    <>
      <div css={css({ padding: "0.7rem 0.7rem 0.3rem" })}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedEntry(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            highlightedEmojiItem == null
              ? "Search"
              : highlightedEmojiItem.description ?? "Search"
            // : `:${highlightedEmojiItem.aliases?.[0]}:` ?? "Search"
          }
          css={(theme) =>
            css({
              color: "white",
              background: theme.colors.backgroundSecondary,
              fontSize: "1.5rem",
              fontWeight: "400",
              borderRadius: "0.3rem",
              padding: "0.5rem 0.7rem",
              width: "100%",
              outline: "none",
              border: 0,
              "&:focus": {
                boxShadow: `0 0 0 0.2rem ${theme.colors.primary}`,
              },
            })
          }
        />
      </div>

      <div
        css={css({
          position: "relative",
          flex: 1,
          overflow: "auto",
          scrollPaddingTop: "3rem",
          scrollPaddingBottom: "0.5rem",
        })}
      >
        {filteredEmojisByCategoryEntries.map(([category, emojis], ci) => (
          <div key={category}>
            <div
              css={(theme) =>
                css({
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: `linear-gradient(-180deg, ${theme.colors.dialogBackground} 50%, transparent)`,
                  padding: "0.6rem 0.9rem",
                  fontSize: "1.2rem",
                  fontWeight: "500",
                  color: "rgb(255 255 255 / 40%)",
                  textTransform: "uppercase",
                  pointerEvents: "none",
                })
              }
            >
              {category}
            </div>
            <div
              css={css({ display: "grid", padding: "0 0.5rem" })}
              style={{
                gridTemplateColumns: `repeat(${ROW_LENGTH}, max-content)`,
              }}
            >
              {emojis.map(({ emoji }, i) => {
                const isHighlighted =
                  highlightedEntry != null &&
                  highlightedEntry[0] === ci &&
                  highlightedEntry[1] === i;
                return (
                  <Emoji
                    key={emoji}
                    emoji={emoji}
                    isHighlighted={isHighlighted}
                    ref={(el) => {
                      if (el == null) return;
                      if (isHighlighted)
                        el.scrollIntoView({ block: "nearest" });
                    }}
                    onClick={() => {
                      addReaction(emoji);
                    }}
                    onMouseMove={() => {
                      if (
                        highlightedEntry != null &&
                        highlightedEntry[0] === ci &&
                        highlightedEntry[1] === i
                      )
                        return;
                      setHighlightedEntry([ci, i]);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const Emoji = React.forwardRef(({ emoji, isHighlighted, ...props }, ref) => (
  <button
    ref={ref}
    data-selected={isHighlighted ? "true" : undefined}
    css={(theme) =>
      css({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.2rem",
        width: "3.4rem",
        height: "2.9rem",
        background: "none",
        borderRadius: "0.5rem",
        border: 0,
        cursor: "pointer",
        outline: "none",
        "&[data-selected]": {
          background: "rgb(255 255 255 / 10%)",
        },
        "&:focus": {
          position: "relative",
          zIndex: 2,
          boxShadow: `0 0 0 0.2rem ${theme.colors.primary}`,
        },
      })
    }
    {...props}
  >
    {emoji}
  </button>
));

const MessageToolbar = ({
  dropdownItems = [],
  isOwnMessage,
  canEditMessage,
  startEditMode,
  initReply,
  addReaction,
  onDropdownOpenChange,
  isEmojiPickerOpen,
  onEmojiPickerOpenChange,
}) => (
  <Toolbar.Root>
    <Popover.Root
      open={isEmojiPickerOpen}
      onOpenChange={onEmojiPickerOpenChange}
    >
      <Toolbar.Button
        asChild
        aria-label="Add reaction"
        style={{ position: "relative" }}
      >
        <Popover.Trigger>
          <AddEmojiReactionIcon style={{ width: "1.6rem" }} />
          <Popover.Anochor
            style={{
              width: "3.3rem",
              height: "3.3rem",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translateY(-50%) translateX(-50%)",
              pointerEvents: "none",
            }}
          />
        </Popover.Trigger>
      </Toolbar.Button>
      <Popover.Content
        side="left"
        align="center"
        sideOffset={4}
        style={{
          width: "31.6rem",
          height: "28.4rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Popover.Arrow offset={13} />
        <EmojiPicker addReaction={addReaction} />
      </Popover.Content>
    </Popover.Root>

    {!isOwnMessage && (
      <Toolbar.Button
        onClick={() => {
          initReply();
        }}
        aria-label="Reply"
      >
        <ReplyArrowIcon css={css({ width: "1.6rem", height: "auto" })} />
      </Toolbar.Button>
    )}

    {canEditMessage && (
      <Toolbar.Button
        onClick={() => {
          startEditMode();
        }}
        aria-label="Edit"
      >
        <EditPenIcon />
      </Toolbar.Button>
    )}
    <Toolbar.Separator />
    <DropdownMenu.Root modal={false} onOpenChange={onDropdownOpenChange}>
      <Toolbar.Button asChild>
        <DropdownMenu.Trigger>
          <DotsHorizontalIcon css={css({ width: "1.6rem", height: "auto" })} />
        </DropdownMenu.Trigger>
      </Toolbar.Button>
      <DropdownMenu.Content>
        {dropdownItems.map(({ onSelect, label, type, ...props }, i) => {
          if (type === "separator") return <DropdownMenu.Separator key={i} />;
          return (
            <DropdownMenu.Item key={i} onSelect={onSelect} {...props}>
              {label}
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Toolbar.Root>
);

const EditMessageInput = React.forwardRef(
  ({ blocks, save, remove, onCancel, ...props }, editorRef) => {
    const [pendingMessage, setPendingMessage] = React.useState(() =>
      normalizeNodes(withoutAttachments(blocks))
    );

    const [isSaving, setSaving] = React.useState(false);

    const allowSubmit = !isSaving;
    const isDisabled = !allowSubmit;

    const submit = async () => {
      if (!allowSubmit) return;

      const blocks = cleanNodes(pendingMessage);

      const isEmpty = blocks.every(isNodeEmpty);

      setSaving(true);
      try {
        if (
          isEmpty &&
          confirm("Are you sure you want to remove this message?")
        ) {
          await remove();
          return;
        }

        await save(blocks);
      } catch (e) {
        console.error(e);
        setSaving(false);
      }
    };

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        css={(theme) =>
          css({
            position: "relative",
            background: theme.colors.channelInputBackground,
            padding: "0.6rem 0.8rem 0.8rem",
            borderRadius: "0.7rem",
            // Prevents iOS zooming in on input fields
            "@supports (-webkit-touch-callout: none)": {
              "[role=textbox]": { fontSize: "1.6rem" },
            },
          })
        }
      >
        <MessageInput
          ref={editorRef}
          initialValue={pendingMessage}
          onChange={(value) => {
            setPendingMessage(value);
          }}
          placeholder={`Press "Enter" to delete message`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onCancel();
              return;
            }

            if (!e.isDefaultPrevented() && !e.shiftKey && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          disabled={isDisabled}
          disableCommands
          {...props}
        />
        <div css={css({ display: "flex", justifyContent: "flex-end" })}>
          <div
            css={css({
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(max-content, 1fr))",
              justifyContent: "flex-end",
              gridGap: "0.8rem",
              padding: "0.5rem 0 0",
            })}
          >
            <Button size="small" onClick={onCancel} disabled={!allowSubmit}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              type="submit"
              disabled={!allowSubmit}
            >
              Save
            </Button>
          </div>
        </div>
      </form>
    );
  }
);

const RepliedMessage = ({ message, getUserMentionDisplayName }) => {
  const authorMember = message?.authorServerMember ?? message?.authorUser;

  return (
    <div
      css={css({
        position: "relative",
        paddingLeft: "5rem",
        marginBottom: "0.5rem",
        ":before": {
          content: '""',
          position: "absolute",
          right: "calc(100% - 5rem + 0.3rem)",
          top: "calc(50% - 1px)",
          width: "2.9rem",
          height: "1.4rem",
          borderTop: "2px solid rgb(255 255 255 / 15%)",
          borderLeft: "2px solid rgb(255 255 255 / 15%)",
          borderRight: 0,
          borderBottom: 0,
          borderTopLeftRadius: "0.4rem",
        },
      })}
    >
      <div
        css={css({
          display: "grid",
          gridTemplateColumns: "1.4rem minmax(0,1fr)",
          alignItems: "center",
          gridGap: "0.5rem",
        })}
      >
        {message == null ? (
          <div
            style={{
              width: "1.4rem",
              height: "1.4rem",
              borderRadius: "0.2rem",
              background: "rgb(255 255 255 / 10%)",
            }}
          />
        ) : (
          <ServerMemberAvatar
            userId={message.authorUserId}
            serverId={message.serverId}
            size="1.4rem"
            borderRadius="0.2rem"
          />
        )}

        <div
          css={css({
            fontSize: "1.3rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "rgb(255 255 255 / 54%)",
          })}
        >
          <span
            role="button"
            tabIndex={0}
            css={css({
              cursor: "pointer",
              fontWeight: "500",
              ":hover": { textDecoration: "underline" },
            })}
            onClick={() => {
              alert(
                `Congratulations, you clicked "${authorMember?.displayName}"`
              );
            }}
          >
            {authorMember?.displayName ?? "..."}
          </span>{" "}
          <span
            role="button"
            tabIndex={0}
            css={(theme) =>
              css({
                cursor: "pointer",
                ":hover": { color: theme.colors.textNormal },
              })
            }
            onClick={() => {
              alert("Congratulations, you clicked a replied message!");
            }}
          >
            <RichText
              inline
              blocks={message?.content ?? []}
              getUserMentionDisplayName={getUserMentionDisplayName}
            />
          </span>
        </div>
      </div>
    </div>
  );
};

const TinyMutedText = ({ children, nowrap = false }) => (
  <div
    css={(theme) =>
      css({
        color: theme.colors.textMuted,
        fontSize: "1rem",
        whiteSpace: nowrap ? "nowrap" : undefined,
      })
    }
  >
    {children}
  </div>
);

export default ChannelMessage;
