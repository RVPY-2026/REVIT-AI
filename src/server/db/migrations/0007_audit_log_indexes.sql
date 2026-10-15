CREATE INDEX "audit_log_created_id_index" ON "audit_log" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_entity_id_index" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_created_index" ON "audit_log" USING btree ("action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_actor_created_index" ON "audit_log" USING btree ("actor_id","created_at" DESC NULLS LAST);