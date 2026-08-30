import { createFileRoute } from '@tanstack/react-router'

import { FileManagementPage } from '#/features/file-management/FileManagementPage'

export const Route = createFileRoute('/file-management')({ component: FileManagementPage })
