import { Appointment, Customer, Service, User } from "@prisma/client";

/**
 * Appointment entity with customer, service and staff relations loaded.
 *
 * Staff relation only requires identification fields for notification payloads.
 */
export type AppointmentWithRelations = Appointment & {
  customer: Customer;
  service: Service;
  staff: Pick<User, "id" | "firstName" | "lastName">;
};
