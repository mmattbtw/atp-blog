import type { PubLeafletDocument } from "@atcute/leaflet";

import { LeafletRenderer } from "./leaflet-renderer";
import { WhiteWindRenderer } from "./whitewind-renderer";

export function StandardSiteRenderer({
  content,
  uri,
  did,
  basePath,
}: {
  content:
    | {
        $type?: string;
        text?: string;
        pages?: unknown[];
      }
    | undefined;
  uri: string;
  did: string;
  basePath?: string;
}) {
  if (content?.$type === "pub.leaflet.content" && content.pages) {
    return (
      <LeafletRenderer
        document={{ pages: content.pages as PubLeafletDocument.Main["pages"] } as PubLeafletDocument.Main}
        did={did}
        uri={uri}
        basePath={basePath}
      />
    );
  }

  if (content?.$type === "site.standard.content.markdown" && content.text) {
    return <WhiteWindRenderer content={content.text} />;
  }

  return null;
}
