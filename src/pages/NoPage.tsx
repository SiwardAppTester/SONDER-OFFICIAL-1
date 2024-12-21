import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function NoPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-10 rounded-lg text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-8">
          Oops! The page you are looking for does not exist.
        </p>
        <Link
          to="/"
          //   className="inline-block bg-blue-500 text-white py-2 px-4 rounded-md shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          className="flex justify-center"
        >
          <Button>Go to Home</Button>
        </Link>
      </div>
    </div>
  );
}
