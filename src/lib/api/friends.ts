import { api } from "@/lib/axios";

export interface AddFriendRequest {
  friendLoginId: string;
}

export interface AddFriendResponse {
  loginId: string;
}

// 분당 10회 제한 — 닉네임 정확히 입력, 쌍방 즉시 성립
export const addFriend = (data: AddFriendRequest) =>
  api.post<AddFriendResponse>("/api/friends", data).then((res) => res.data);

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
