import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

interface RejectListingBody {
  reason?: string;
}

interface AdminListingMutationData {
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
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
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
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
      { data: null, error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as RejectListingBody;
  const reason = body.reason?.trim();

  if (!reason) {
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
      { data: null, error: "Please enter a reason for rejection." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const { error } = await adminClient
    .from("listings")
    .update({
      rejection_reason: reason,
      status: "rejected",
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<AdminListingMutationData>>({
    data: { success: true },
    error: null,
  });
}
