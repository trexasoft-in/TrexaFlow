import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { getCentralUserFromAuthHeader } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  const centralUser = getCentralUserFromAuthHeader(req.headers.get('authorization'));
  if (!centralUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const joinId = body.code?.trim().toUpperCase();
  const fullName = body.fullName || body.name || centralUser.name || 'User';

  if (!joinId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
  }

  const { data: workspace, error: wsError } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('workspace_code', joinId)
    .maybeSingle();

  if (wsError || !workspace) {
    return NextResponse.json({ error: 'Workspace not found. Please check the ID.' }, { status: 404 });
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('user_id', centralUser.userid)
    .maybeSingle();

  if (!existing) {
    // Join workspace
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: centralUser.userid,
        role: 'member',
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Auto-add new member to all public channels in the workspace
    const { data: publicChannels } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_private', false);

    if (publicChannels && publicChannels.length > 0) {
      await supabaseAdmin
        .from('channel_members')
        .insert(
          publicChannels.map(ch => ({
            channel_id: ch.id,
            user_id: centralUser.userid,
          }))
        );
    }

    // Find the Lobby channel
    const { data: lobbyChannel } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('is_default', true)
      .maybeSingle();

    // Post welcome message in Lobby
    if (lobbyChannel) {
      await supabaseAdmin
        .from('messages')
        .insert({
          channel_id: lobbyChannel.id,
          sender_id: centralUser.userid,
          content: `👋 **${fullName.trim()}** just joined the workspace. Welcome!`,
          is_pinned: false,
          is_system: true,
        });
    }
  }

  return NextResponse.json({ workspace });
}
