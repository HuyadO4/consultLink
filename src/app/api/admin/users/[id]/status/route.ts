import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

interface UpdateUserStatusBody {
  suspended?: boolean;
}

interface UpdateUserStatusData {
  success: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<UpdateUserStatusData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json<ApiResponse<UpdateUserStatusData>>(
      { data: null, error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as UpdateUserStatusBody;

  if (typeof body.suspended !== "boolean") {
    return NextResponse.json<ApiResponse<UpdateUserStatusData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const { error } = await adminClient
    .from("profiles")
    .update({
      is_suspended: body.suspended,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<UpdateUserStatusData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<UpdateUserStatusData>>({
    data: { success: true },
    error: null,
  });
}
