import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { getCentralUserFromAuthHeader } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  const centralUser = getCentralUserFromAuthHeader(req.headers.get('authorization'));
  if (!centralUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: memberships } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', centralUser.userid);

  const workspaceIds = memberships?.map(m => m.workspace_id) ?? [];
  const workspaceId = workspaceIds[0] ?? null;

  let workspaces: any[] = [];
  if (workspaceIds.length > 0) {
    const { data: wsData } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds);
    workspaces = wsData ?? [];
  }

  // Fetch the actual profile from the 'users' table if it exists
  let dbProfile = null;
  try {
    const { data } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', centralUser.userid)
      .maybeSingle();
    if (data) {
      dbProfile = data;
    }
  } catch (err) {
    console.error('Failed to fetch DB profile in bootstrap', err);
  }

  const finalProfile = {
    id: centralUser.userid,
    userid: centralUser.userid,
    name: dbProfile?.name || dbProfile?.full_name || centralUser.name || 'User',
    full_name: dbProfile?.full_name || dbProfile?.name || centralUser.name || 'User',
    email: dbProfile?.email || centralUser.email || '',
    bio: dbProfile?.bio || dbProfile?.job_title || '',
    job_title: dbProfile?.job_title || dbProfile?.bio || 'Team Member',
    avatarurl: dbProfile?.avatarurl || dbProfile?.avatar_url || '',
    avatar_url: dbProfile?.avatar_url || dbProfile?.avatarurl || '',
  };

  return NextResponse.json({
    profile: finalProfile,
    workspaceId,
    workspaceIds,
    workspaces,
  });
}
