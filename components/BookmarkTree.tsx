import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { cn } from './ui/cn';
import type { BookmarkMenuNode } from '../libs/BookmarkLib';

interface BookmarkTreeProps {
  data: BookmarkMenuNode[];
  selectedId?: string;
  onNodeClick: (node: BookmarkMenuNode) => void;
}

export function BookmarkTree({
  data,
  selectedId,
  onNodeClick,
}: BookmarkTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderNode = (node: BookmarkMenuNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded',
            isSelected && 'bg-primary/10 text-primary font-medium',
            level > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => onNodeClick(node)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="mr-1 p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-1" />
            ) : (
              <Folder className="w-4 h-4 mr-1" />
            )
          ) : null}
          <span className="text-sm">{node.label}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="py-2">{data.map((node) => renderNode(node))}</div>;
}

