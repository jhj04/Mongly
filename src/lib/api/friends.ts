import { api } from "@/lib/axios";

export interface Friend {
  loginId: string;
  createdAt: string;
}

export interface FriendsListResponse {
  total: number;
  friends: Friend[];
}

// total은 설정 페이지 'N/10' 카운터용, 페이지네이션 없음(최대 10명)
export const getFriends = () =>
  api.get<FriendsListResponse>("/api/friends").then((res) => res.data);

export interface DeleteFriendsRequest {
  friendLoginIds: string[];
}

export interface DeleteFriendsResponse {
  deleted: number;
}

// 전체 성공/전체 실패, 쌍방 해제
export const deleteFriends = (data: DeleteFriendsRequest) =>
  api.delete<DeleteFriendsResponse>("/api/friends", { data }).then((res) => res.data);

export interface FriendJarEmotion {
  emotionId: number;
  name: string;
  colorHex: string;
  count: number;
}

export interface FriendJar {
  id: string;
  recordDate: string;
  dominantEmotionId: number | null;
  emotions: FriendJarEmotion[];
}

export interface FriendShelfEntry {
  loginId: string;
  jar: FriendJar | null;
}

export interface FriendsJarsResponse {
  friends: FriendShelfEntry[];
}

// 친구 탭 선반 — 친구마다 최신 유리병 1개씩. 분당 30회 제한.
// 유리병이 없는 친구는 jar: null로 내려와 비활성 슬롯으로 표시됨.
export const getFriendsJars = () =>
  api.get<FriendsJarsResponse>("/api/friends/jars").then((res) => res.data);

export interface SendFriendRequestRequest {
  toLoginId: string;
}

export interface SendFriendRequestResponse {
  loginId: string;
  status: "pending" | "accepted";
}

// 설정 모달 — 정확한 닉네임 입력, 분당 10회 제한.
// 상대가 이미 나에게 요청해 뒀으면 요청 생성 없이 즉시 성립(status: "accepted")
export const sendFriendRequest = (data: SendFriendRequestRequest) =>
  api.post<SendFriendRequestResponse>("/api/friend-requests", data).then((res) => res.data);

export interface FriendRequestItem {
  id: string;
  fromLoginId: string;
  createdAt: string;
}

export interface FriendRequestsResponse {
  total: number;
  requests: FriendRequestItem[];
}

// 종 아이콘 팝업 — 받은 대기 중 요청(최신순). total이 빨간 점 배지 값(0이면 점 없음)
export const getFriendRequests = () =>
  api.get<FriendRequestsResponse>("/api/friend-requests").then((res) => res.data);

export interface AcceptFriendRequestResponse {
  loginId: string;
}

// 받은 사람만 처리 가능 — 성립하면 쌍방 친구가 되고 요청은 사라짐
export const acceptFriendRequest = (id: string) =>
  api.post<AcceptFriendRequestResponse>(`/api/friend-requests/${id}/accept`).then((res) => res.data);

// 받은 사람만 처리 가능 — 요청만 삭제(상대에게 알리지 않음, 재신청 가능)
export const rejectFriendRequest = (id: string) =>
  api.post<{ ok: boolean }>(`/api/friend-requests/${id}/reject`).then((res) => res.data);
