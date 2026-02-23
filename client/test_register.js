import axios from 'axios';

const testRegister = async () => {
    try {
        const response = await axios.post('http://localhost:5001/api/auth/register', {
            email: 'rs7479742674@gmail.com',
            password: 'password123',
            fullName: 'Test User',
            role: 'engineer',
            phone: '1234567890'
        });
        console.log('Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testRegister();
