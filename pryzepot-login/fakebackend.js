function login(email, password) {

    if (
        email === "sam@test.com" &&
        password === "123456"
    ) {
        return {
            success: true,
            username: "Sam",
            balance: 25
        };
    }

    return {
        success: false
    };
}