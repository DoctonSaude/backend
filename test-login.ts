
import { UserCrud } from './src/crud/user.crud.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from './src/config/env.js';

async function testLoginLogic() {
  const email = 'rodrigo.vilela@docton.com';
  const password = '123456';
  
  console.log(`Testing login logic for ${email}...`);
  
  try {
    const user = await UserCrud.findByEmail(email);
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.id, user.role);
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);
    
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email, personId: user.personId },
      String(env.JWT_SECRET),
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    console.log('JWT generated successfully');
    
    const { password: _p, ...userWithoutPassword } = user;
    
    if (user.role === 'PARTNER') {
      const partner = (user as any).Partner;
      (userWithoutPassword as any).isApproved = partner?.isApproved ?? false;
      (userWithoutPassword as any).partnerType = partner?.type ?? 'INDIVIDUAL';
    }
    
    console.log('Login logic completed successfully');
    console.log('User without password:', JSON.stringify(userWithoutPassword, null, 2));

  } catch (error) {
    console.error('Login logic FAILED:');
    console.error(error);
  }
}

testLoginLogic().then(() => process.exit(0));
