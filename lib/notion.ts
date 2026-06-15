const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export function getNotionAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    response_type: "code",
    owner: "user",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`,
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params}`;
}

export async function exchangeNotionCode(
  code: string
): Promise<{ access_token: string; workspace_id: string; duplicated_template_id?: string }> {
  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`,
    }),
  });

  if (!res.ok) throw new Error("Failed to exchange Notion code");
  return res.json();
}

export async function createNotionPage(
  accessToken: string,
  databaseId: string,
  event: { title: string; notes?: string; dueAt?: Date }
): Promise<string> {
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: event.title } }] },
  };

  if (event.dueAt) {
    properties["Due Date"] = { date: { start: event.dueAt.toISOString() } };
  }

  if (event.notes) {
    properties["Notes"] = { rich_text: [{ text: { content: event.notes } }] };
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion error: ${err}`);
  }

  const data = await res.json();
  return data.url as string;
}

export async function getNotionDatabases(accessToken: string): Promise<Array<{ id: string; title: string }>> {
  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ filter: { value: "database", property: "object" } }),
  });

  if (!res.ok) return [];
  const data = await res.json();

  return (data.results ?? []).map((db: Record<string, unknown>) => {
    const titleArr = (db.title as Array<{ plain_text: string }>) ?? [];
    return {
      id: db.id as string,
      title: titleArr.map((t) => t.plain_text).join("") || "Untitled",
    };
  });
}
