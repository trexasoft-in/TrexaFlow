export async function markChannelRead(_channelId: string, _userId: string) {
  return;
}

export async function markDMRead(_userId: string, _otherUserId: string, _workspaceId: string) {
  return;
}

export async function markProjectChatRead(_projectId: string, _userId: string) {
  return;
}

export async function getChannelUnreadCount(_channelId: string, _userId: string): Promise<number> {
  return 0;
}

export async function getDMUnreadCount(_userId: string, _otherUserId: string, _workspaceId: string): Promise<number> {
  return 0;
}

export async function getProjectChatUnreadCount(_projectId: string, _userId: string): Promise<number> {
  return 0;
}
