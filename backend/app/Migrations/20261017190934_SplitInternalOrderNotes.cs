using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PSeq.Operations.Api.Migrations
{
    /// <inheritdoc />
    public partial class SplitInternalOrderNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "private_notes",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(16000)",
                maxLength: 16000,
                nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "public_notes",
                schema: "commercial_ops",
                table: "lab_service_orders",
                type: "character varying(16000)",
                maxLength: 16000,
                nullable: true);

            // Preserve the original text as formatted PRIVATE notes. Customer-authored
            // orders retain their existing description and draft contracts.
            migrationBuilder.Sql("""
                CREATE FUNCTION pg_temp.order_note_html(value text) RETURNS text
                LANGUAGE sql IMMUTABLE AS $fn$
                  SELECT CASE WHEN value IS NULL OR btrim(value) = '' THEN NULL ELSE
                    '<p>' || replace(replace(replace(replace(replace(replace(
                      value, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
                      E'\r\n', E'\n'), E'\r', E'\n'), E'\n', '<br>') || '</p>' END
                $fn$;

                CREATE TEMP TABLE order_notes_internal_ids ON COMMIT DROP AS
                SELECT o.id FROM commercial_ops.lab_service_orders o
                WHERE o.commercial_draft_json IS NOT NULL OR o.source_request_id IS NOT NULL
                   OR EXISTS (SELECT 1 FROM commercial_ops.organization_memberships m
                     JOIN commercial_ops.organizations a ON a.id = m.organization_id
                     WHERE m.user_id = o.created_by_user_id AND a.kind = 'Phaeno');

                UPDATE commercial_ops.lab_service_orders o
                SET private_notes = pg_temp.order_note_html(coalesce(o.commercial_draft_json->>'notes', o.description)),
                    description = NULL,
                    commercial_draft_json = CASE WHEN o.commercial_draft_json IS NULL THEN NULL ELSE
                      (o.commercial_draft_json - 'notes') || jsonb_build_object(
                        'privateNotes', pg_temp.order_note_html(o.commercial_draft_json->>'notes'),
                        'publicNotes', NULL) END
                FROM order_notes_internal_ids internal WHERE o.id = internal.id;

                -- A retried historical command must not replay a customer-visible copy
                -- of the old internal description or revision notes. Keep audit rows intact.
                UPDATE commercial_ops.order_idempotency_records r
                SET response_json = (r.response_json - 'privateNotes' - 'commercialDraft') ||
                    jsonb_build_object('description', NULL) ||
                    CASE WHEN r.scope LIKE 'platform:%' THEN jsonb_build_object(
                      'privateNotes', pg_temp.order_note_html(coalesce(r.response_json->'commercialDraft'->>'notes', r.response_json->>'description')),
                      'commercialDraft', CASE WHEN jsonb_typeof(r.response_json->'commercialDraft') = 'object' THEN
                        ((r.response_json->'commercialDraft') - 'notes') || jsonb_build_object(
                          'privateNotes', pg_temp.order_note_html(r.response_json->'commercialDraft'->>'notes'), 'publicNotes', NULL)
                        ELSE NULL END)
                    ELSE jsonb_build_object('requestRevisions', CASE
                      WHEN jsonb_typeof(r.response_json->'requestRevisions') = 'array' THEN
                        (SELECT coalesce(jsonb_agg(CASE WHEN item->>'snapshotJson' IS NOT NULL THEN
                          jsonb_set(item, '{snapshotJson}', to_jsonb(((item->>'snapshotJson')::jsonb
                            - 'jobNotes' - 'JobNotes' - 'privateNotes' - 'PrivateNotes')::text)) ELSE item END), '[]'::jsonb)
                         FROM jsonb_array_elements(r.response_json->'requestRevisions') item)
                      ELSE r.response_json->'requestRevisions' END) END
                FROM order_notes_internal_ids internal WHERE r.response_json->>'id' = internal.id::text;

                DROP FUNCTION pg_temp.order_note_html(text);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "private_notes",
                schema: "commercial_ops",
                table: "lab_service_orders");

            migrationBuilder.DropColumn(
                name: "public_notes",
                schema: "commercial_ops",
                table: "lab_service_orders");
        }
    }
}
