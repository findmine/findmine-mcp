/**
 * Registers every FindMine tool on a server instance. Write tools are feature-flagged
 * by environment config and are not registered (or listed) when disabled.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { FindMineDeps } from '../server.js';
import { registerGetCompleteTheLook } from './get-complete-the-look.js';
import { registerGetStyleGuide } from './get-style-guide.js';
import { registerGetVisuallySimilar } from './get-visually-similar.js';
import { registerTrackInteraction } from './track-interaction.js';
import { registerUpdateItemDetails } from './update-item-details.js';

export function registerTools(server: McpServer, deps: FindMineDeps): void {
  registerGetStyleGuide(server);
  registerGetCompleteTheLook(server, deps);
  registerGetVisuallySimilar(server, deps);

  if (deps.config.features.enableTracking) {
    registerTrackInteraction(server, deps);
  }
  if (deps.config.features.enableItemDetailsUpdates) {
    registerUpdateItemDetails(server, deps);
  }
}
