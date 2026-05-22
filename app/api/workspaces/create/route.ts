import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { getCentralUserFromAuthHeader } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  const centralUser = getCentralUserFromAuthHeader(req.headers.get('authorization'));
  if (!centralUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const workspaceName = body.name?.trim();
  const description = body.description?.trim() || null;
  const imageUrl = body.imageUrl || body.image_url || null;

  if (!workspaceName) {
    return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
  }

  const workspaceCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  let workspace;
  let wsError;

  // Try standard owner_id first
  const { data: ws1, error: err1 } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name: workspaceName,
      description,
      image_url: imageUrl,
      workspace_code: workspaceCode,
      owner_id: centralUser.userid,
    })
    .select()
    .single();

  // Insert owner as admin member
  const { error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: centralUser.userid,
      role: 'admin',
    });

  if (memberError) {
    return NextResponse.json(
      {
        error: `Workspace created but member link failed: ${memberError.message}`,
        workspaceId: workspace.id,
      },
      { status: 500 }
    );
  }

  // Create default Lobby channel if membership succeeded
  try {
    const { data: lobbyChannel } = await supabaseAdmin
      .from('channels')
      .insert({
        workspace_id: workspace.id,
        name: 'lobby',
        description: 'Welcome to the workspace!',
        is_private: false,
        created_by: centralUser.userid,
        is_default: true,
      })
      .select()
      .single();

    if (lobbyChannel) {
      await supabaseAdmin
        .from('channel_members')
        .insert({
          channel_id: lobbyChannel.id,
          user_id: centralUser.userid,
        });

      await supabaseAdmin
        .from('messages')
        .insert({
          channel_id: lobbyChannel.id,
          sender_id: centralUser.userid,
          content: `👋 **${(body.fullName || centralUser.name || 'User').trim()}** created this workspace. Welcome!`,
          is_pinned: false,
          is_system: true,
        });
    }
  } catch (channelErr) {
    console.error('Failed to create default channel/welcome message', channelErr);
  }

  return NextResponse.json({ workspace });
}
