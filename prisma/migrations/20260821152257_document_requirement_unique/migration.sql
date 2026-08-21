-- DropIndex
DROP INDEX "documents_applicationId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "documents_applicationId_requirementCode_key" ON "documents"("applicationId", "requirementCode");

