import { Client } from "@stomp/stompjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import axiosClient from "../api/axiosClient";

const PUBLIC_ROOM_ID = "public";

const getDmStorageKey = (userId) => `chat_dm_conversations_${userId}`;
const getUnreadStorageKey = (userId) => `chat_unread_counts_${userId}`;

const uploadToCloudinary = async (file) => {
  const cloudName = "duoxi6ro8";
  const uploadPreset = "ChatSever";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const rawError = await response.text();
      const parsedError = safeParseJson(rawError, null);
      throw new Error(
        parsedError?.error?.message ||
          parsedError?.message ||
          `Cloudinary lỗi ${response.status}`,
      );
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Tải tệp thất bại.");
  }
};

function mergeMessages(existingMessages, incomingMessages) {
  const messageMap = new Map();

  const normalizeMessage = (message) => {
    if (!message) {
      return message;
    }

    const hasCreatedAt =
      message.createdAt && !Number.isNaN(new Date(message.createdAt).getTime());
    if (hasCreatedAt) {
      return message;
    }

    return {
      ...message,
      clientCreatedAt: message.clientCreatedAt || new Date().toISOString(),
    };
  };

  existingMessages.forEach((message) => {
    const normalizedMessage = normalizeMessage(message);
    const key =
      normalizedMessage.msgId ??
      `${normalizedMessage.senderId}-${normalizedMessage.receiverId}-${normalizedMessage.createdAt || normalizedMessage.clientCreatedAt}-${normalizedMessage.content}`;
    messageMap.set(key, normalizedMessage);
  });

  incomingMessages.forEach((message) => {
    const normalizedMessage = normalizeMessage(message);
    const key =
      normalizedMessage.msgId ??
      `${normalizedMessage.senderId}-${normalizedMessage.receiverId}-${normalizedMessage.createdAt || normalizedMessage.clientCreatedAt}-${normalizedMessage.content}`;
    messageMap.set(key, normalizedMessage);
  });

  return [...messageMap.values()].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.clientCreatedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.clientCreatedAt || 0).getTime();
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.msgId ?? 0) - (b.msgId ?? 0);
  });
}

function inferFileMessageType(file) {
  if (file.type.startsWith("image/")) {
    return "IMAGE";
  }
  if (file.type.startsWith("video/")) {
    return "VIDEO";
  }
  return "FILE";
}

function getConversationKey(currentUserId, message) {
  if (message.receiverId == null) {
    return PUBLIC_ROOM_ID;
  }

  const peerId =
    message.senderId === currentUserId ? message.receiverId : message.senderId;
  return String(peerId);
}

function formatMessageDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute} ${day}/${month}/${year}`;
}

function messagePreviewText(message, currentUserId) {
  if (!message) {
    return "Chưa có tin nhắn.";
  }

  const type = String(message.messageType || "TEXT").toUpperCase();
  let content = message.content || "";

  if (type === "IMAGE") {
    content = "[Hình ảnh]";
  } else if (type === "VIDEO") {
    content = "[Video]";
  } else if (type === "FILE") {
    content = "[File]";
  }

  const prefix = message.senderId === currentUserId ? "Bạn: " : "";
  return `${prefix}${content}`;
}

function safeParseJson(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function ChatRoom() {
  const navigate = useNavigate();
  const messageEndRef = useRef(null);
  const stompClientRef = useRef(null);
  const activeConversationRef = useRef(PUBLIC_ROOM_ID);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [allMessages, setAllMessages] = useState([]);
  const [draftText, setDraftText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [userDirectory, setUserDirectory] = useState({});
  const [friends, setFriends] = useState([]);
  const [dmConversationIds, setDmConversationIds] = useState([]);
  const [unreadCountByConversation, setUnreadCountByConversation] = useState(
    {},
  );
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeFriendshipStatus, setActiveFriendshipStatus] = useState({
    relation: "NONE",
    friendshipId: null,
    requesterId: null,
    receiverId: null,
  });

  const [activeConversation, setActiveConversation] = useState(PUBLIC_ROOM_ID);
  const [connectionStatus, setConnectionStatus] = useState("Đang kết nối...");
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [isAcceptingFriendRequest, setIsAcceptingFriendRequest] =
    useState(false);
  const [error, setError] = useState("");

  const [isCalling, setIsCalling] = useState(false);
  const [callMode, setCallMode] = useState("video");
  const [callPeerId, setCallPeerId] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const currentUser = useMemo(() => {
    const rawUser = localStorage.getItem("chat_user");
    if (!rawUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawUser);
      const userId = Number(parsed.userId);
      if (!Number.isInteger(userId) || userId <= 0 || !parsed.username) {
        return null;
      }
      return {
        userId,
        username: parsed.username,
        avatarUrl: parsed.avatarUrl || "",
      };
    } catch {
      return null;
    }
  }, []);

  const onlineUsers = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return onlineUserIds
      .filter((userId) => userId !== currentUser.userId)
      .map((userId) => ({
        id: String(userId),
        label: userDirectory[userId]?.username || `User #${userId}`,
        isOnline: true,
      }));
  }, [onlineUserIds, userDirectory, currentUser]);

  const conversationSummaryByKey = useMemo(() => {
    if (!currentUser) {
      return {};
    }

    const summary = {};
    allMessages.forEach((message) => {
      const key = getConversationKey(currentUser.userId, message);
      summary[key] = message;
    });

    return summary;
  }, [allMessages, currentUser]);

  const publicConversationSummary = useMemo(() => {
    const lastMessage = conversationSummaryByKey[PUBLIC_ROOM_ID];
    return {
      preview: messagePreviewText(lastMessage, currentUser?.userId ?? 0),
      time: lastMessage
        ? formatMessageDateTime(
            lastMessage.createdAt || lastMessage.clientCreatedAt,
          )
        : "",
    };
  }, [conversationSummaryByKey, currentUser]);

  const privateConversations = useMemo(() => {
    const mapped = dmConversationIds.map((userId) => {
      const summary = conversationSummaryByKey[String(userId)];
      const timestamp = summary?.createdAt
        ? new Date(summary.createdAt).getTime()
        : summary?.clientCreatedAt
          ? new Date(summary.clientCreatedAt).getTime()
          : 0;

      return {
        id: String(userId),
        label: userDirectory[userId]?.username || `User #${userId}`,
        isOnline: onlineUserIds.includes(userId),
        preview: messagePreviewText(summary, currentUser?.userId ?? 0),
        time: summary
          ? formatMessageDateTime(summary.createdAt || summary.clientCreatedAt)
          : "",
        unreadCount: unreadCountByConversation[userId] || 0,
        timestamp,
      };
    });

    return mapped.sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return a.label.localeCompare(b.label);
    });
  }, [
    dmConversationIds,
    userDirectory,
    onlineUserIds,
    conversationSummaryByKey,
    currentUser,
    unreadCountByConversation,
  ]);

  const displayedMessages = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return allMessages.filter((message) => {
      const key = getConversationKey(currentUser.userId, message);
      return key === activeConversation;
    });
  }, [allMessages, activeConversation, currentUser]);

  const activeConversationIsPrivate =
    activeConversation !== PUBLIC_ROOM_ID && Number(activeConversation) > 0;

  const activePrivateTargetId = activeConversationIsPrivate
    ? Number(activeConversation)
    : null;

  const activeActionLabel = useMemo(() => {
    if (activeFriendshipStatus.relation === "INCOMING_REQUEST") {
      return "Đồng ý kết bạn";
    }
    if (activeFriendshipStatus.relation === "OUTGOING_REQUEST") {
      return "Đã gửi lời mời";
    }
    if (activeFriendshipStatus.relation === "FRIEND") {
      return "Đã là bạn bè";
    }
    return "Kết bạn";
  }, [activeFriendshipStatus]);

  const canSendFriendRequest = activeFriendshipStatus.relation === "NONE";
  const canAcceptFriendRequest =
    activeFriendshipStatus.relation === "INCOMING_REQUEST";

  const activeConversationLabel =
    userDirectory[Number(activeConversation)]?.username ||
    `User #${activeConversation}`;

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const loadUserDirectory = async () => {
    const response = await axiosClient.get("/api/users");
    if (!Array.isArray(response.data)) {
      return {};
    }

    const directory = response.data.reduce((accumulator, item) => {
      const userId = Number(item.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        return accumulator;
      }

      accumulator[userId] = {
        userId,
        username: item.username || `User #${userId}`,
        avatarUrl: item.avatarUrl || "",
      };
      return accumulator;
    });

    setUserDirectory(directory);
    return directory;
  };

  const loadConversationHistory = async (conversationKey) => {
    if (!currentUser) {
      return;
    }

    try {
      setError("");

      if (conversationKey === PUBLIC_ROOM_ID) {
        const response = await axiosClient.get("/api/chat/history/public");
        setAllMessages((previous) => mergeMessages(previous, response.data));
        return;
      }

      const targetId = Number(conversationKey);
      const response = await axiosClient.get("/api/chat/history/private", {
        params: {
          userId1: currentUser.userId,
          userId2: targetId,
        },
      });
      setAllMessages((previous) => mergeMessages(previous, response.data));
    } catch {
      setError("Không tải được lịch sử chat. Hãy kiểm tra backend.");
    }
  };

  const loadPrivateConversationPartners = async () => {
    if (!currentUser) {
      return [];
    }

    try {
      const response = await axiosClient.get(
        "/api/chat/history/private/conversations",
        {
          params: {
            userId: currentUser.userId,
          },
        },
      );

      if (!Array.isArray(response.data)) {
        return [];
      }

      return response.data
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
    } catch {
      return [];
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await axiosClient.get("/api/users/online");
      if (!Array.isArray(response.data)) {
        return;
      }

      const normalized = response.data
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
      setOnlineUserIds(normalized);
    } catch {
      setOnlineUserIds([]);
    }
  };

  const loadFriends = async () => {
    if (!currentUser) {
      return;
    }

    try {
      const response = await axiosClient.get(
        `/api/friendships/${currentUser.userId}/friends`,
      );
      setFriends(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError("Không tải được danh sách bạn bè.");
    }
  };

  const loadPendingRequests = async () => {
    if (!currentUser) {
      return;
    }

    try {
      const response = await axiosClient.get(
        `/api/friendships/${currentUser.userId}/requests`,
      );
      setPendingRequests(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPendingRequests([]);
    }
  };

  const loadActiveFriendshipStatus = async (targetUserId) => {
    if (!currentUser || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      setActiveFriendshipStatus({
        relation: "NONE",
        friendshipId: null,
        requesterId: null,
        receiverId: null,
      });
      return;
    }

    try {
      const response = await axiosClient.get("/api/friendships/status", {
        params: {
          userId1: currentUser.userId,
          userId2: targetUserId,
        },
      });
      setActiveFriendshipStatus({
        relation: response.data?.relation || "NONE",
        friendshipId: response.data?.friendshipId || null,
        requesterId: response.data?.requesterId || null,
        receiverId: response.data?.receiverId || null,
      });
    } catch {
      setActiveFriendshipStatus({
        relation: "NONE",
        friendshipId: null,
        requesterId: null,
        receiverId: null,
      });
    }
  };

  const refreshFriendshipData = async () => {
    await Promise.all([loadFriends(), loadPendingRequests()]);
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const stopLocalStream = () => {
    if (!localStreamRef.current) {
      return;
    }
    localStreamRef.current.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  };

  const stopRemoteStream = () => {
    if (!remoteStreamRef.current) {
      return;
    }
    remoteStreamRef.current.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
  };

  const resetCallState = () => {
    closePeerConnection();
    stopLocalStream();
    stopRemoteStream();
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    pendingIceCandidatesRef.current = [];
    setIsCalling(false);
    setCallPeerId(null);
    setCallStatus("");
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsCamOff(false);
  };

  const sendCallSignal = (type, receiverId, data = "", mode = callMode) => {
    if (!currentUser || !stompClientRef.current?.connected || !receiverId) {
      return;
    }

    stompClientRef.current.publish({
      destination: "/app/call.signal",
      body: JSON.stringify({
        type,
        senderId: currentUser.userId,
        receiverId,
        data,
        callMode: mode,
      }),
    });
  };

  const ensureLocalStream = async (mode) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  // ĐÃ SỬA CHUẨN XÁC HÀM buildPeerConnection
  const buildPeerConnection = (peerId, mode) => {
    closePeerConnection();

    const connection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: "turn:chatsever.metered.live:80",
          username: "7a00925041dadea42a8de725",
          credential: "1/eahuaoi5oy4lbL",
        },
        {
          urls: "turn:chatsever.metered.live:443",
          username: "7a00925041dadea42a8de725",
          credential: "1/eahuaoi5oy4lbL",
        },
        {
          urls: "turn:chatsever.metered.live:443?transport=tcp",
          username: "7a00925041dadea42a8de725",
          credential: "1/eahuaoi5oy4lbL",
        },
      ],
    });

    connection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }
      sendCallSignal("ice", peerId, JSON.stringify(event.candidate), mode);
    };

    connection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    connection.onconnectionstatechange = () => {
      if (
        connection.connectionState === "failed" ||
        connection.connectionState === "disconnected" ||
        connection.connectionState === "closed"
      ) {
        resetCallState();
      }
    };

    peerConnectionRef.current = connection;
    return connection;
  };

  const flushPendingIceCandidates = async () => {
    if (!peerConnectionRef.current) {
      return;
    }

    const pending = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of pending) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch {
        setError("Không xử lý được ICE candidate.");
      }
    }
  };

  const startOutgoingCall = async (mode) => {
    if (!currentUser || !activeConversationIsPrivate) {
      setError("Chỉ gọi được trong khung chat riêng.");
      return;
    }

    const peerId = Number(activeConversation);

    try {
      setError("");
      setCallMode(mode);
      setIsCalling(true);
      setCallPeerId(peerId);
      setCallStatus(
        mode === "audio" ? "Đang gọi audio..." : "Đang gọi video...",
      );

      const stream = await ensureLocalStream(mode);
      const connection = buildPeerConnection(peerId, mode);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendCallSignal("offer", peerId, JSON.stringify(offer), mode);
    } catch {
      setError("Không thể bắt đầu cuộc gọi. Kiểm tra camera/microphone.");
      resetCallState();
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) {
      return;
    }

    const mode = incomingCall.callMode || "video";

    try {
      setError("");
      setCallMode(mode);
      setIsCalling(true);
      setCallPeerId(incomingCall.senderId);
      setCallStatus("Đang kết nối cuộc gọi...");

      const stream = await ensureLocalStream(mode);
      const connection = buildPeerConnection(incomingCall.senderId, mode);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      const offer = safeParseJson(incomingCall.data);
      if (!offer) {
        throw new Error("Invalid offer");
      }

      await connection.setRemoteDescription(offer);
      await flushPendingIceCandidates();

      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      sendCallSignal(
        "answer",
        incomingCall.senderId,
        JSON.stringify(answer),
        mode,
      );
      setIncomingCall(null);
      setCallStatus("Đang trong cuộc gọi");
    } catch {
      setError("Không thể nhận cuộc gọi lúc này.");
      resetCallState();
    }
  };

  const rejectIncomingCall = () => {
    if (incomingCall?.senderId) {
      sendCallSignal(
        "end",
        incomingCall.senderId,
        "reject",
        incomingCall.callMode || "video",
      );
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    if (callPeerId) {
      sendCallSignal("end", callPeerId, "hangup", callMode);
    }
    resetCallState();
  };

  const openPrivateConversation = (targetUserId) => {
    if (!currentUser) {
      return;
    }

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return;
    }

    if (targetUserId === currentUser.userId) {
      return;
    }

    setDmConversationIds((previous) => {
      if (previous.includes(targetUserId)) {
        return previous;
      }
      return [...previous, targetUserId];
    });
    setUnreadCountByConversation((previous) => {
      if (!previous[targetUserId]) {
        return previous;
      }

      return {
        ...previous,
        [targetUserId]: 0,
      };
    });
    setActiveConversation(String(targetUserId));
  };

  const toggleMic = () => {
    if (!localStreamRef.current) {
      return;
    }

    const next = !isMicMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMicMuted(next);
  };

  const toggleCam = () => {
    if (!localStreamRef.current) {
      return;
    }

    const next = !isCamOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsCamOff(next);
  };

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      try {
        const persistedDmRaw = localStorage.getItem(
          getDmStorageKey(currentUser.userId),
        );
        const persistedDmIds = safeParseJson(persistedDmRaw, []);
        const normalizedDmIds = Array.isArray(persistedDmIds)
          ? persistedDmIds
              .map((item) => Number(item))
              .filter((item) => Number.isInteger(item) && item > 0)
          : [];

        const persistedUnreadRaw = localStorage.getItem(
          getUnreadStorageKey(currentUser.userId),
        );
        const persistedUnread = safeParseJson(persistedUnreadRaw, {});
        const normalizedUnread =
          persistedUnread && typeof persistedUnread === "object"
            ? Object.entries(persistedUnread).reduce((acc, [key, value]) => {
                const userId = Number(key);
                const count = Number(value);
                if (
                  Number.isInteger(userId) &&
                  userId > 0 &&
                  Number.isInteger(count) &&
                  count > 0
                ) {
                  acc[userId] = count;
                }
                return acc;
              }, {})
            : {};

        setDmConversationIds(normalizedDmIds);
        setUnreadCountByConversation(normalizedUnread);
        setIsStorageHydrated(true);

        const serverConversationIds = await loadPrivateConversationPartners();
        const mergedConversationIds = [
          ...new Set([...normalizedDmIds, ...serverConversationIds]),
        ];
        setDmConversationIds(mergedConversationIds);

        if (persistedUnread && typeof persistedUnread === "object") {
          setUnreadCountByConversation(normalizedUnread);
        }

        const directory = await loadUserDirectory();
        if (!isMounted) {
          return;
        }

        if (!directory[currentUser.userId]) {
          localStorage.removeItem("chat_user");
          navigate("/login");
          return;
        }

        await Promise.all([
          loadOnlineUsers(),
          loadConversationHistory(PUBLIC_ROOM_ID),
          refreshFriendshipData(),
          ...mergedConversationIds.map((conversationId) =>
            loadConversationHistory(String(conversationId)),
          ),
        ]);
      } catch {
        if (isMounted) {
          setError("Không tải được dữ liệu khởi tạo.");
          setIsStorageHydrated(true);
        }
      }
    };

    const client = new Client({
      connectHeaders: {
        userId: String(currentUser.userId),
      },
      reconnectDelay: 5000,
      webSocketFactory: () =>
        new SockJS("https://chatsever-production.up.railway.app/ws"),
      onConnect: () => {
        setConnectionStatus("Đã kết nối realtime");

        client.subscribe("/topic/public", (frame) => {
          const payload = JSON.parse(frame.body);
          setAllMessages((previous) => mergeMessages(previous, [payload]));
        });

        client.subscribe(`/topic/private/${currentUser.userId}`, (frame) => {
          const payload = JSON.parse(frame.body);
          const peerId =
            payload.senderId === currentUser.userId
              ? Number(payload.receiverId)
              : Number(payload.senderId);

          if (Number.isInteger(peerId) && peerId > 0) {
            setDmConversationIds((previous) =>
              previous.includes(peerId) ? previous : [peerId, ...previous],
            );

            if (
              payload.senderId !== currentUser.userId &&
              String(peerId) !== activeConversationRef.current
            ) {
              setUnreadCountByConversation((previous) => ({
                ...previous,
                [peerId]: (previous[peerId] || 0) + 1,
              }));
            }
          }

          setAllMessages((previous) => mergeMessages(previous, [payload]));
        });

        const onOnlineUpdate = (frame) => {
          const payload = safeParseJson(frame.body, []);
          if (!Array.isArray(payload)) {
            return;
          }

          const normalized = payload
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item > 0);
          setOnlineUserIds(normalized);
        };

        client.subscribe("/topic/public.online", onOnlineUpdate);
        client.subscribe("/topic/online_users", onOnlineUpdate);

        client.subscribe(`/topic/call/${currentUser.userId}`, async (frame) => {
          const payload = safeParseJson(frame.body, {});
          const signalType = String(payload.type || "").toLowerCase();

          if (!payload.senderId) {
            return;
          }

          if (signalType === "offer") {
            setIncomingCall({
              senderId: payload.senderId,
              data: payload.data,
              callMode: payload.callMode || "video",
            });
            return;
          }

          if (signalType === "answer") {
            if (!peerConnectionRef.current) {
              return;
            }
            const answer = safeParseJson(payload.data);
            if (!answer) {
              return;
            }
            try {
              await peerConnectionRef.current.setRemoteDescription(answer);
              await flushPendingIceCandidates();
              setCallStatus("Đang trong cuộc gọi");
            } catch {
              setError("Không xử lý được answer.");
            }
            return;
          }

          if (signalType === "ice") {
            const candidateObj = safeParseJson(payload.data);
            if (!candidateObj) {
              return;
            }

            const candidate = new RTCIceCandidate(candidateObj);
            if (
              peerConnectionRef.current &&
              peerConnectionRef.current.remoteDescription
            ) {
              try {
                await peerConnectionRef.current.addIceCandidate(candidate);
              } catch {
                setError("Không xử lý được ICE candidate.");
              }
            } else {
              pendingIceCandidatesRef.current.push(candidate);
            }
            return;
          }

          if (signalType === "end") {
            resetCallState();
          }
        });
      },
      onWebSocketClose: () => {
        setConnectionStatus("Mất kết nối. Đang thử kết nối lại...");
      },
      onStompError: () => {
        setConnectionStatus("STOMP lỗi. Kiểm tra backend logs.");
      },
    });

    stompClientRef.current = client;
    client.activate();
    initialize();

    return () => {
      isMounted = false;
      resetCallState();
      client.deactivate();
    };
  }, [currentUser, navigate]);

  useEffect(() => {
    loadConversationHistory(activeConversation);
  }, [activeConversation]);

  useEffect(() => {
    if (!currentUser || !isStorageHydrated) {
      return;
    }

    localStorage.setItem(
      getDmStorageKey(currentUser.userId),
      JSON.stringify(dmConversationIds),
    );
  }, [dmConversationIds, currentUser, isStorageHydrated]);

  useEffect(() => {
    if (!currentUser || !isStorageHydrated) {
      return;
    }

    localStorage.setItem(
      getUnreadStorageKey(currentUser.userId),
      JSON.stringify(unreadCountByConversation),
    );
  }, [unreadCountByConversation, currentUser, isStorageHydrated]);

  useEffect(() => {
    if (!activeConversationIsPrivate) {
      return;
    }

    const targetUserId = Number(activeConversation);
    setUnreadCountByConversation((previous) => {
      if (!previous[targetUserId]) {
        return previous;
      }

      return {
        ...previous,
        [targetUserId]: 0,
      };
    });
  }, [activeConversation, activeConversationIsPrivate]);

  useEffect(() => {
    if (!activeConversationIsPrivate) {
      setActiveFriendshipStatus({
        relation: "NONE",
        friendshipId: null,
        requesterId: null,
        receiverId: null,
      });
      return;
    }

    loadActiveFriendshipStatus(Number(activeConversation));
  }, [
    activeConversation,
    activeConversationIsPrivate,
    friends,
    pendingRequests,
  ]);

  useEffect(() => {
    if (!activeConversationIsPrivate) {
      return;
    }

    const targetUserId = Number(activeConversation);
    const intervalId = window.setInterval(() => {
      loadActiveFriendshipStatus(targetUserId);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [activeConversation, activeConversationIsPrivate]);

  useEffect(() => {
    if (onlineUserIds.length > 0) {
      loadUserDirectory();
    }
  }, [onlineUserIds]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  const handleSendMessage = async () => {
    const trimmedText = draftText.trim();

    if (!trimmedText && !selectedFile) {
      return;
    }

    if (!currentUser || !stompClientRef.current?.connected) {
      setError("Chưa kết nối websocket, không gửi được tin nhắn.");
      return;
    }

    if (!userDirectory[currentUser.userId]) {
      setError(
        "Tài khoản hiện tại không tồn tại trên hệ thống. Hãy đăng nhập lại.",
      );
      localStorage.removeItem("chat_user");
      navigate("/login");
      return;
    }

    let contentToSend = trimmedText;
    let messageType = "TEXT";

    if (selectedFile) {
      setIsUploading(true);
      try {
        const fileUrl = await uploadToCloudinary(selectedFile);
        if (!fileUrl) {
          throw new Error("Không lấy được liên kết file");
        }

        contentToSend = fileUrl;
        messageType = inferFileMessageType(selectedFile);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Upload file thất bại.",
        );
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const payload = {
      senderId: Number(currentUser.userId),
      receiverId:
        activeConversation === PUBLIC_ROOM_ID
          ? null
          : Number(activeConversation),
      content: contentToSend,
      messageType,
    };

    stompClientRef.current.publish({
      destination: "/app/chat.send",
      body: JSON.stringify(payload),
    });

    setDraftText("");
    setSelectedFile(null);
    setError("");

    const fileInput = document.getElementById("fileUpload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser) {
      return;
    }

    if (!userDirectory[currentUser.userId]) {
      setError(
        "Tài khoản hiện tại không tồn tại trên hệ thống. Hãy đăng nhập lại.",
      );
      localStorage.removeItem("chat_user");
      navigate("/login");
      return;
    }

    const receiverId = activePrivateTargetId;
    if (!Number.isInteger(receiverId) || receiverId <= 0) {
      setError("Hãy mở chat riêng với người bạn muốn kết bạn.");
      return;
    }
    if (receiverId === currentUser.userId) {
      setError("Không thể gửi kết bạn cho chính bạn.");
      return;
    }

    try {
      setIsSendingFriendRequest(true);
      setError("");
      await axiosClient.post("/api/friendships/requests", {
        senderId: currentUser.userId,
        receiverId,
      });
      await refreshFriendshipData();
      await loadActiveFriendshipStatus(receiverId);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Gửi lời mời kết bạn thất bại.",
      );
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  const handleAcceptIncomingFriendRequest = async () => {
    if (!currentUser || !activeFriendshipStatus.friendshipId) {
      return;
    }

    try {
      setIsAcceptingFriendRequest(true);
      setError("");
      await axiosClient.post(
        `/api/friendships/requests/${activeFriendshipStatus.friendshipId}/accept`,
        null,
        {
          params: { userId: currentUser.userId },
        },
      );
      await refreshFriendshipData();
      if (activePrivateTargetId) {
        await loadActiveFriendshipStatus(activePrivateTargetId);
      }
    } catch {
      setError("Không thể chấp nhận lời mời kết bạn lúc này.");
    } finally {
      setIsAcceptingFriendRequest(false);
    }
  };

  const handleUnfriend = async () => {
    if (!currentUser || !activeFriendshipStatus.friendshipId) {
      return;
    }

    try {
      setError("");
      await axiosClient.delete(
        `/api/friendships/${activeFriendshipStatus.friendshipId}`,
        {
          params: { userId: currentUser.userId },
        },
      );
      await refreshFriendshipData();
      if (activePrivateTargetId) {
        await loadActiveFriendshipStatus(activePrivateTargetId);
      }
    } catch {
      setError("Không thể xóa bạn lúc này.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_user");
    resetCallState();
    navigate("/login");
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="chat-page three-column-layout">
      <aside className="chat-sidebar-left">
        <div className="sidebar-header">
          <div className="current-user">
            <div className="user-badge">
              {currentUser.username.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2>{currentUser.username}</h2>
              <p>ID: {currentUser.userId}</p>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>

        <div className="conversation-list">
          <button
            type="button"
            className={`conversation-item ${
              activeConversation === PUBLIC_ROOM_ID ? "active" : ""
            }`}
            onClick={() => setActiveConversation(PUBLIC_ROOM_ID)}
          >
            <div className="conversation-main">
              <span className="conversation-user-label">Phòng công khai</span>
              <span className="conversation-preview">
                {publicConversationSummary.preview}
              </span>
            </div>
            <span className="conversation-time">
              {publicConversationSummary.time}
            </span>
          </button>

          {privateConversations.map((contact) => {
            const isOnline = contact.isOnline;

            return (
              <button
                key={contact.id}
                type="button"
                className={`conversation-item ${
                  activeConversation === contact.id ? "active" : ""
                }`}
                onClick={() => openPrivateConversation(Number(contact.id))}
              >
                <div className="conversation-main">
                  <span className="conversation-user-label">
                    {contact.label}
                  </span>
                  <span className="conversation-preview">
                    {contact.preview}
                  </span>
                </div>
                <div className="conversation-aside">
                  <span className="conversation-user-state">
                    <span
                      className={`status-dot ${isOnline ? "online" : "offline"}`}
                    />
                    {isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                  </span>
                  {contact.unreadCount > 0 ? (
                    <span className="conversation-unread-badge">
                      {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                    </span>
                  ) : null}
                  <span className="conversation-time">{contact.time}</span>
                </div>
              </button>
            );
          })}

          {privateConversations.length === 0 ? (
            <div className="sidebar-empty">Chưa có đoạn chat riêng nào.</div>
          ) : null}
        </div>
      </aside>

      <main className="chat-main-column">
        <header className="chat-main-header">
          <div>
            <h1>
              {activeConversation === PUBLIC_ROOM_ID
                ? "Phòng chat công khai"
                : `Chat riêng với ${activeConversationLabel}`}
            </h1>
          </div>

          {activeConversationIsPrivate ? (
            <div className="call-actions">
              <button
                className="btn-friend-action"
                type="button"
                onClick={
                  canAcceptFriendRequest
                    ? handleAcceptIncomingFriendRequest
                    : handleSendFriendRequest
                }
                disabled={
                  isSendingFriendRequest ||
                  isAcceptingFriendRequest ||
                  (!canSendFriendRequest && !canAcceptFriendRequest)
                }
              >
                {isSendingFriendRequest || isAcceptingFriendRequest
                  ? "Đang xử lý..."
                  : activeActionLabel}
              </button>
              {activeFriendshipStatus.relation === "FRIEND" ? (
                <button
                  className="btn-unfriend"
                  type="button"
                  onClick={handleUnfriend}
                >
                  Xóa bạn
                </button>
              ) : null}
              <button
                className="btn-call-audio"
                type="button"
                onClick={() => startOutgoingCall("audio")}
                disabled={isCalling}
              >
                Gọi Audio
              </button>
              <button
                className="btn-call-video"
                type="button"
                onClick={() => startOutgoingCall("video")}
                disabled={isCalling}
              >
                Gọi Video
              </button>
            </div>
          ) : null}
        </header>

        {error ? <div className="chat-error">{error}</div> : null}

        <section className="message-list">
          {displayedMessages.length === 0 ? (
            <div className="empty-chat">
              Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên.
            </div>
          ) : (
            displayedMessages.map((message) => {
              const isMine = message.senderId === currentUser.userId;
              const type = String(message.messageType || "text").toUpperCase();

              return (
                <article
                  key={
                    message.msgId ??
                    `${message.senderId}-${message.createdAt}-${message.content}`
                  }
                  className={`message-item ${isMine ? "mine" : "other"}`}
                >
                  <div className="message-meta">
                    <span>
                      {userDirectory[message.senderId]?.username ||
                        `User #${message.senderId}`}
                    </span>
                    <span>
                      {formatMessageDateTime(
                        message.createdAt || message.clientCreatedAt,
                      )}
                    </span>
                  </div>

                  <div className="message-content">
                    {type === "IMAGE" ? (
                      <img
                        src={message.content}
                        alt="uploaded"
                        style={{ maxWidth: "100%", borderRadius: "8px" }}
                      />
                    ) : type === "VIDEO" ? (
                      <video
                        src={message.content}
                        controls
                        preload="metadata"
                        style={{ maxWidth: "100%", borderRadius: "8px" }}
                      />
                    ) : type === "FILE" ? (
                      <a
                        href={message.content}
                        target="_blank"
                        rel="noreferrer"
                        className="file-download-link"
                      >
                        Tệp:{" "}
                        {decodeURIComponent(message.content.split("/").pop())}
                      </a>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </article>
              );
            })
          )}
          <div ref={messageEndRef} />
        </section>

        <footer className="chat-input-area pinned-input">
          <textarea
            placeholder="Nhập nội dung tin nhắn..."
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            rows={2}
            disabled={isUploading}
          />

          <div className="chat-actions">
            <label className="file-picker" htmlFor="fileUpload">
              {selectedFile ? selectedFile.name : "Chọn ảnh/video/file"}
            </label>
            <input
              id="fileUpload"
              type="file"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
              disabled={isUploading}
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isUploading}
            >
              {isUploading ? "Đang tải lên..." : "Gửi"}
            </button>
          </div>
        </footer>
      </main>

      <aside className="chat-sidebar-right">
        <div className="right-sidebar-header">
          <h3>Tất cả đang online</h3>
          <p>{onlineUsers.length} người</p>
        </div>

        <div className="online-list">
          {onlineUsers.length === 0 ? (
            <div className="sidebar-empty">Chưa có ai online.</div>
          ) : (
            onlineUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`online-user-item ${
                  activeConversation === user.id ? "active" : ""
                }`}
                onClick={() => openPrivateConversation(Number(user.id))}
              >
                <span className="conversation-user-label">{user.label}</span>
                <span className="conversation-user-state">
                  <span className="status-dot online" />
                  Trực tuyến
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {incomingCall ? (
        <div className="call-modal-overlay">
          <div className="call-modal-card incoming-call-card">
            <div className="incoming-call-badge">Đang gọi cho bạn</div>
            <h3>Cuộc gọi đến</h3>
            <p className="incoming-call-user">
              {userDirectory[incomingCall.senderId]?.username ||
                `User #${incomingCall.senderId}`}
            </p>
            <p className="incoming-call-mode">
              Kiểu gọi: {incomingCall.callMode === "audio" ? "Audio" : "Video"}
            </p>
            <div className="call-control-row">
              <button
                type="button"
                className="accept-call"
                onClick={acceptIncomingCall}
              >
                Nhận cuộc gọi
              </button>
              <button
                type="button"
                className="end-call"
                onClick={rejectIncomingCall}
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCalling ? (
        <div className="call-modal-overlay">
          <div className="call-modal-card call-active-card">
            <h3>
              Cuộc gọi {callMode === "audio" ? "Audio" : "Video"} với{" "}
              {userDirectory[callPeerId]?.username || `User #${callPeerId}`}
            </h3>
            <p>{callStatus || "Đang trong cuộc gọi"}</p>

            <div className="video-grid">
              <video ref={localVideoRef} autoPlay playsInline muted />
              <video ref={remoteVideoRef} autoPlay playsInline />
            </div>

            <div className="call-control-row">
              <button type="button" onClick={toggleMic}>
                {isMicMuted ? "Bật mic" : "Tắt mic"}
              </button>
              <button
                type="button"
                onClick={toggleCam}
                disabled={callMode !== "video"}
              >
                {isCamOff ? "Bật cam" : "Tắt cam"}
              </button>
              <button type="button" className="end-call" onClick={endCall}>
                Tắt cuộc gọi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ChatRoom;
