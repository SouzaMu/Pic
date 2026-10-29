CREATE TABLE "barber_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"demo_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"day" date NOT NULL,
	"items" jsonb NOT NULL,
	"total" integer NOT NULL,
	"status" text DEFAULT 'agendado' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barber_appointment_total_positive" CHECK ("total" > 0),
	CONSTRAINT "barber_appointment_status_valid" CHECK ("status" IN ('agendado','confirmado','aguardando','em_atendimento','finalizado','pago','cancelado','faltou'))
);
--> statement-breakpoint
CREATE TABLE "barber_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"demo_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barber_demos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barber_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"demo_id" uuid NOT NULL,
	"appointment_id" uuid,
	"day" date NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"kind" text NOT NULL,
	"method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barber_movement_amount_positive" CHECK ("amount" > 0),
	CONSTRAINT "barber_movement_kind_valid" CHECK ("kind" IN ('entrada','saida')),
	CONSTRAINT "barber_movement_method_valid" CHECK ("method" IN ('dinheiro','debito','credito','pix'))
);
--> statement-breakpoint
CREATE INDEX "barber_appointments_demo_day_idx" ON "barber_appointments" ("demo_id","day");--> statement-breakpoint
CREATE INDEX "barber_clients_demo_idx" ON "barber_clients" ("demo_id");--> statement-breakpoint
CREATE INDEX "barber_movements_demo_day_idx" ON "barber_movements" ("demo_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "barber_one_payment_per_appointment" ON "barber_movements" ("appointment_id");--> statement-breakpoint
ALTER TABLE "barber_appointments" ADD CONSTRAINT "barber_appointments_demo_id_barber_demos_id_fkey" FOREIGN KEY ("demo_id") REFERENCES "barber_demos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "barber_appointments" ADD CONSTRAINT "barber_appointments_client_id_barber_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "barber_clients"("id");--> statement-breakpoint
ALTER TABLE "barber_clients" ADD CONSTRAINT "barber_clients_demo_id_barber_demos_id_fkey" FOREIGN KEY ("demo_id") REFERENCES "barber_demos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "barber_movements" ADD CONSTRAINT "barber_movements_demo_id_barber_demos_id_fkey" FOREIGN KEY ("demo_id") REFERENCES "barber_demos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "barber_movements" ADD CONSTRAINT "barber_movements_appointment_id_barber_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "barber_appointments"("id");