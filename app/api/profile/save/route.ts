import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseAdmin';
import { getCentralUserFromAuthHeader } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  const centralUser = getCentralUserFromAuthHeader(req.headers.get('authorization'));
  if (!centralUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const name = body.fullName || body.name || body.full_name || centralUser.name || 'User';
  const bio = body.jobTitle || body.job_title || body.bio || '';
  const avatarurl = body.avatarUrl || body.avatar_url || body.avatarurl || '';

  // Try combined payload first
  try {
    const payload: any = {
      id: centralUser.userid,
      email: centralUser.email || body.email || '',
      full_name: name.trim(),
      job_title: bio.trim(),
      avatar_url: avatarurl,
      name: name.trim(),
      bio: bio.trim(),
      avatarurl: avatarurl,
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (!error) {
      return NextResponse.json({ ok: true, user: data });
    }

    // Fallback 1: Try standard TrexaFlow columns (full_name, job_title, avatar_url)
    const fallbackPayload = {
      id: centralUser.userid,
      email: centralUser.email || body.email || '',
      full_name: name.trim(),
      job_title: bio.trim(),
      avatar_url: avatarurl || null,
    };

    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from('users')
      .upsert(fallbackPayload, { onConflict: 'id' })
      .select()
      .single();

    if (!fallbackError) {
      return NextResponse.json({ ok: true, user: fallbackData });
    }

    // Fallback 2: Try explicit user snippet columns (name, bio, avatarurl)
    const explicitPayload = {
      id: centralUser.userid,
      name: name.trim(),
      email: centralUser.email || body.email || '',
      bio: bio.trim(),
      avatarurl: avatarurl,
    };

    const { data: explicitData, error: explicitError } = await supabaseAdmin
      .from('users')
      .upsert(explicitPayload, { onConflict: 'id' })
      .select()
      .single();

    if (explicitError) {
      return NextResponse.json({ error: explicitError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: explicitData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
