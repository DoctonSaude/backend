
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testValidation() {
    try {
        // 1. Ensure a partner exists
        let partner = await prisma.partner.findFirst({
            include: { user: true }
        });

        if (!partner) {
            console.log('Creating test partner...');
            const user = await prisma.user.create({
                data: {
                    email: `partner_${Date.now()}@test.com`,
                    password: 'password123',
                    name: 'Test Partner',
                    role: 'PARTNER'
                }
            });
            partner = await prisma.partner.create({
                data: {
                    userId: user.id,
                    name: 'Test Partner'
                },
                include: { user: true }
            });
        }

        // 2. Ensure a patient exists
        let patient = await prisma.patient.findFirst({
            include: { user: true }
        });

        if (!patient) {
            console.log('Creating test patient...');
            const user = await prisma.user.create({
                data: {
                    email: `patient_${Date.now()}@test.com`,
                    password: 'password123',
                    name: 'Test Patient',
                    role: 'PATIENT'
                }
            });
            patient = await prisma.patient.create({
                data: {
                    userId: user.id,
                    cpf: `00000000${Math.floor(Math.random() * 999)}`,
                    birthDate: new Date('1990-01-01')
                },
                include: { user: true }
            });
        }

        // 3. Create a test appointment
        const appointment = await prisma.appointment.create({
            data: {
                patientId: patient.id,
                partnerId: partner.id,
                dateTime: new Date(),
                duration: 30,
                status: 'CONFIRMED',
                isOnline: false,
            }
        });

        console.log(`Created appointment with ID: ${appointment.id}`);

        // 4. Test validation with full ID
        const code = appointment.id;

        let where: any = {
            partnerId: partner.id,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            OR: [
                { id: code },
                { id: { endsWith: code } }
            ]
        };

        let found = await prisma.appointment.findFirst({
            where,
            include: {
                patient: {
                    include: { user: { select: { name: true } } }
                }
            }
        });
        console.log(`Validation with full ID (${code}): ${found ? 'SUCCESS' : 'FAILED'}`);
        if (found) console.log(`Patient Name: ${found.patient.user.name}`);

        // 5. Test validation with suffix (last 6 chars)
        const suffix = appointment.id.slice(-6);
        let whereSuffix: any = {
            partnerId: partner.id,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            OR: [
                { id: suffix },
                { id: { endsWith: suffix } }
            ]
        };

        const foundSuffix = await prisma.appointment.findFirst({
            where: whereSuffix,
            include: {
                patient: {
                    include: { user: { select: { name: true } } }
                }
            }
        });
        console.log(`Validation with suffix (${suffix}): ${foundSuffix ? 'SUCCESS' : 'FAILED'}`);
        if (foundSuffix) console.log(`Patient Name: ${foundSuffix.patient.user.name}`);

        // 6. Test logic similar to partner.routes.ts update
        if (foundSuffix) {
            await prisma.appointment.update({
                where: { id: foundSuffix.id },
                data: { status: 'COMPLETED' }
            });
            console.log('Appointment marked as COMPLETED');
        }

        // Clean up if we created them specifically for this test
        // Actually, let's keep them and just delete the appointment
        await prisma.appointment.delete({ where: { id: appointment.id } }).catch(() => { });
        console.log('Test appointment cleaned up');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testValidation();
