export interface RoadmapItem {
  text: string;
  done: boolean;
  section?: string;
}

export function parseRoadmap(content: string): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  let currentSection: string | undefined;

  for (const line of content.split('\n')) {
    const headingMatch = line.match(/^#{2,3}\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      continue;
    }

    const taskMatch = line.match(/^-\s+\[( |x|X)\]\s+(.+)/);
    if (taskMatch) {
      items.push({
        text: taskMatch[2].trim(),
        done: taskMatch[1].toLowerCase() === 'x',
        section: currentSection,
      });
    }
  }

  return items;
}
