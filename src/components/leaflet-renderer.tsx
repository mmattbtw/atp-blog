import Image from "next/image";
import type {
  PubLeafletBlocksBlockquote,
  PubLeafletBlocksBskyPost,
  PubLeafletBlocksCode,
  PubLeafletBlocksHeader,
  PubLeafletBlocksImage,
  PubLeafletBlocksText,
  PubLeafletBlocksUnorderedList,
  PubLeafletDocument,
  PubLeafletPagesLinearDocument,
  PubLeafletRichtextFacet,
} from "@atcute/leaflet";
import { Code as SyntaxHighlighter } from "bright";

import { BlueskyPostEmbed } from "./bluesky-embed";
import { Code, Paragraph, Title } from "./typography";

type RichtextFacet = PubLeafletRichtextFacet.Main;

// Helper to apply facets (rich text formatting) to plaintext
function applyFacets(plaintext: string, facets?: RichtextFacet[]) {
  if (!facets || facets.length === 0) {
    return <>{plaintext}</>;
  }

  // Convert string to bytes for proper slicing
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(plaintext);

  // Sort facets by start position
  const sortedFacets = [...facets].sort(
    (a, b) => a.index.byteStart - b.index.byteStart,
  );

  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  sortedFacets.forEach((facet, idx) => {
    const { byteStart, byteEnd } = facet.index;

    // Add text before this facet
    if (byteStart > lastEnd) {
      segments.push(decoder.decode(bytes.slice(lastEnd, byteStart)));
    }

    // Get the text for this facet
    const facetText = decoder.decode(bytes.slice(byteStart, byteEnd));

    // Apply formatting based on features
    let element: React.ReactNode = facetText;

    for (const feature of facet.features) {
      const type = feature.$type;
      if (type === "pub.leaflet.richtext.facet#bold") {
        element = <strong key={`bold-${idx}`}>{element}</strong>;
      } else if (type === "pub.leaflet.richtext.facet#italic") {
        element = <em key={`italic-${idx}`}>{element}</em>;
      } else if (type === "pub.leaflet.richtext.facet#underline") {
        element = (
          <span key={`underline-${idx}`} className="underline">
            {element}
          </span>
        );
      } else if (type === "pub.leaflet.richtext.facet#strikethrough") {
        element = (
          <span key={`strike-${idx}`} className="line-through">
            {element}
          </span>
        );
      } else if (type === "pub.leaflet.richtext.facet#code") {
        element = <Code key={`code-${idx}`}>{element}</Code>;
      } else if (type === "pub.leaflet.richtext.facet#highlight") {
        element = (
          <mark
            key={`highlight-${idx}`}
            className="bg-yellow-200 dark:bg-yellow-800"
          >
            {element}
          </mark>
        );
      } else if (type === "pub.leaflet.richtext.facet#link") {
        const linkFeature = feature as PubLeafletRichtextFacet.Link;
        element = (
          <a
            key={`link-${idx}`}
            href={linkFeature.uri}
            className="font-medium underline underline-offset-4"
          >
            {element}
          </a>
        );
      }
    }

    segments.push(<span key={`segment-${idx}`}>{element}</span>);
    lastEnd = byteEnd;
  });

  // Add remaining text after last facet
  if (lastEnd < bytes.length) {
    segments.push(decoder.decode(bytes.slice(lastEnd)));
  }

  return <>{segments}</>;
}

// Block renderers
function TextBlock({ block }: { block: PubLeafletBlocksText.Main }) {
  const content = applyFacets(block.plaintext, block.facets);
  const sizeClass =
    block.textSize === "large"
      ? "text-xl"
      : block.textSize === "small"
        ? "text-sm"
        : "";

  return (
    <Paragraph className={`leading-7 not-first:mt-6 ${sizeClass}`}>
      {content}
    </Paragraph>
  );
}

function HeaderBlock({ block }: { block: PubLeafletBlocksHeader.Main }) {
  const level = block.level ?? 1;
  const content = applyFacets(block.plaintext, block.facets);

  return (
    <Title level={`h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"}>
      {content}
    </Title>
  );
}

function CodeBlock({ block }: { block: PubLeafletBlocksCode.Main }) {
  if (block.language) {
    return (
      <SyntaxHighlighter
        lang={block.language}
        className="mt-8! text-sm rounded-sm max-w-full! overflow-hidden"
      >
        {block.plaintext}
      </SyntaxHighlighter>
    );
  }

  return (
    <pre className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-x-auto">
      <code className="text-sm">{block.plaintext}</code>
    </pre>
  );
}

function ImageBlock({
  block,
  did,
}: {
  block: PubLeafletBlocksImage.Main;
  did: string;
}) {
  // Construct blob URL from the image ref
  // The blob can be either a Blob or LegacyBlob type
  const imageBlob = block.image as { ref?: { $link: string }; cid?: string };
  const blobCid = imageBlob.ref?.$link ?? imageBlob.cid ?? "";
  const imageUrl = `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${blobCid}@jpeg`;

  return (
    <span className="block mt-8 w-full aspect-video relative">
      <Image
        src={imageUrl}
        alt={block.alt ?? ""}
        className="object-contain"
        quality={90}
        fill
      />
    </span>
  );
}

function BlockquoteBlock({
  block,
}: {
  block: PubLeafletBlocksBlockquote.Main;
}) {
  const content = applyFacets(block.plaintext, block.facets);

  return (
    <blockquote className="mt-6 border-l-2 pl-4 italic border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400">
      {content}
    </blockquote>
  );
}

function HorizontalRuleBlock() {
  return <hr className="my-8" />;
}

function BskyPostBlock({ block }: { block: PubLeafletBlocksBskyPost.Main }) {
  return <BlueskyPostEmbed uri={block.postRef.uri} />;
}

function ListItemContent({
  content,
  did,
}: {
  content: PubLeafletBlocksUnorderedList.ListItem["content"];
  did: string;
}) {
  const type = content.$type;

  if (type === "pub.leaflet.blocks.text") {
    const textBlock = content as PubLeafletBlocksText.Main;
    return <>{applyFacets(textBlock.plaintext, textBlock.facets)}</>;
  }

  if (type === "pub.leaflet.blocks.header") {
    const headerBlock = content as PubLeafletBlocksHeader.Main;
    return <>{applyFacets(headerBlock.plaintext, headerBlock.facets)}</>;
  }

  if (type === "pub.leaflet.blocks.image") {
    const imageBlock = content as PubLeafletBlocksImage.Main;
    return <ImageBlock block={imageBlock} did={did} />;
  }

  return null;
}

function UnorderedListBlock({
  block,
  did,
}: {
  block: PubLeafletBlocksUnorderedList.Main;
  did: string;
}) {
  const renderListItems = (
    items: PubLeafletBlocksUnorderedList.ListItem[],
  ): React.ReactNode => {
    return items.map((item, idx) => (
      <li key={idx} className="leading-7">
        <ListItemContent content={item.content} did={did} />
        {item.children && item.children.length > 0 && (
          <ul className="my-2 ml-6 list-disc">
            {renderListItems(item.children)}
          </ul>
        )}
      </li>
    ));
  };

  return (
    <ul className="my-6 ml-6 list-disc [&>ul]:my-2 [&>ol]:my-2 [&>li]:mt-2">
      {renderListItems(block.children)}
    </ul>
  );
}

// Main block renderer
function BlockRenderer({
  block,
  alignment,
  did,
}: {
  block: PubLeafletPagesLinearDocument.Block["block"];
  alignment?: string;
  did: string;
}) {
  const alignmentClass =
    alignment === "#textAlignCenter"
      ? "text-center"
      : alignment === "#textAlignRight"
        ? "text-right"
        : alignment === "#textAlignJustify"
          ? "text-justify"
          : "";

  const type = block.$type;

  let content: React.ReactNode = null;

  if (type === "pub.leaflet.blocks.text") {
    content = <TextBlock block={block as PubLeafletBlocksText.Main} />;
  } else if (type === "pub.leaflet.blocks.header") {
    content = <HeaderBlock block={block as PubLeafletBlocksHeader.Main} />;
  } else if (type === "pub.leaflet.blocks.code") {
    content = <CodeBlock block={block as PubLeafletBlocksCode.Main} />;
  } else if (type === "pub.leaflet.blocks.image") {
    content = (
      <ImageBlock block={block as PubLeafletBlocksImage.Main} did={did} />
    );
  } else if (type === "pub.leaflet.blocks.blockquote") {
    content = (
      <BlockquoteBlock block={block as PubLeafletBlocksBlockquote.Main} />
    );
  } else if (type === "pub.leaflet.blocks.horizontalRule") {
    content = <HorizontalRuleBlock />;
  } else if (type === "pub.leaflet.blocks.bskyPost") {
    content = <BskyPostBlock block={block as PubLeafletBlocksBskyPost.Main} />;
  } else if (type === "pub.leaflet.blocks.unorderedList") {
    content = (
      <UnorderedListBlock
        block={block as PubLeafletBlocksUnorderedList.Main}
        did={did}
      />
    );
  } else {
    // Unknown block type - render nothing or placeholder
    console.warn("Unknown block type:", type);
    return null;
  }

  if (alignmentClass) {
    return <div className={alignmentClass}>{content}</div>;
  }

  return content;
}

// Page renderer
function LinearDocumentPage({
  page,
  did,
}: {
  page: PubLeafletPagesLinearDocument.Main;
  did: string;
}) {
  return (
    <>
      {page.blocks.map((blockWrapper, idx) => (
        <BlockRenderer
          key={idx}
          block={blockWrapper.block}
          alignment={blockWrapper.alignment}
          did={did}
        />
      ))}
    </>
  );
}

// Main document renderer
export function LeafletRenderer({
  document,
  did,
  uri,
  basePath,
}: {
  document: PubLeafletDocument.Main;
  did: string;
  uri: string;
  basePath?: string;
}) {
  // Convert AT URI to Leaflet.pub URL
  // base_path from publication is the full domain (e.g., "mat.leaflet.pub")
  // Otherwise fall back to: https://leaflet.pub/{did}/{rkey}
  const rkey = uri.split("/").pop();
  const leafletUrl = basePath
    ? `https://${basePath}/${rkey}`
    : `https://leaflet.pub/${did}/${rkey}`;

  return (
    <div className="[&>.bluesky-embed]:mt-8 [&>.bluesky-embed]:mb-0">
      <p className="text-sm text-muted-foreground italic mb-6 bg-yellow-100/50 dark:bg-yellow-900/50 p-4 rounded-sm">
        This was originally written on Leaflet so it might look better over
        there, see the original{" "}
        <a
          href={leafletUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          here
        </a>
        .
      </p>
      {document.pages.map((page, idx) => {
        if (page.$type === "pub.leaflet.pages.linearDocument") {
          return (
            <LinearDocumentPage
              key={idx}
              page={page as PubLeafletPagesLinearDocument.Main}
              did={did}
            />
          );
        }
        // Canvas pages not supported yet
        return null;
      })}
    </div>
  );
}
